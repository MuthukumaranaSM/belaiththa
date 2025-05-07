import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { Role } from '../auth/enums/role.enum';
import { AppointmentStatus } from '@prisma/client';
import { BlockSlotDto } from './dto/block-slot.dto';
import * as bcrypt from 'bcrypt';

type AllowedRole = Extract<Role, Role.MAIN_DOCTOR | Role.DENTIST | Role.RECEPTIONIST>;

@Injectable()
export class AppointmentService {
  constructor(private prisma: PrismaService) {}

  async create(createAppointmentDto: CreateAppointmentDto) {
    // Verify that the dentist exists and is a dentist
    const dentist = await this.prisma.user.findUnique({
      where: { id: createAppointmentDto.dentistId },
      include: { role: true }
    });

    if (!dentist) {
      throw new BadRequestException('Dentist not found');
    }

    if (dentist.role.name !== Role.DENTIST) {
      throw new BadRequestException('Invalid dentist ID');
    }

    // Find or create customer
    let customer = await this.prisma.user.findUnique({
      where: { email: createAppointmentDto.customerEmail },
      include: { role: true }
    });

    if (!customer) {
      // Create new customer user
      const customerRole = await this.prisma.role.findUnique({
        where: { name: Role.CUSTOMER }
      });

      if (!customerRole) {
        throw new BadRequestException('Customer role not found');
      }

      // Generate a random password for the customer
      const tempPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      customer = await this.prisma.user.create({
        data: {
          email: createAppointmentDto.customerEmail,
          name: createAppointmentDto.customerName,
          password: hashedPassword,
          roleId: customerRole.id,
          customer: {
            create: {}
          }
        },
        include: {
          role: true
        }
      });
    } else if (customer.role.name !== Role.CUSTOMER) {
      throw new BadRequestException('Email already registered as a different role');
    }

    // Check if the slot is blocked
    const isBlocked = await this.isSlotBlocked(
      new Date(createAppointmentDto.appointmentDate),
      createAppointmentDto.startTime,
      createAppointmentDto.endTime,
    );

    if (isBlocked) {
      throw new BadRequestException('This time slot is blocked');
    }

    // Create the appointment
    return this.prisma.appointment.create({
      data: {
        customerId: customer.id,
        dentistId: createAppointmentDto.dentistId,
        appointmentDate: createAppointmentDto.appointmentDate,
        reason: createAppointmentDto.reason,
        notes: createAppointmentDto.notes,
        status: AppointmentStatus.PENDING,
      },
      include: {
        customer: true,
        dentist: true,
      },
    });
  }

  async findAll() {
    return this.prisma.appointment.findMany({
      include: {
        customer: true,
        dentist: true,
      },
    });
  }

  async findOne(id: number) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        customer: true,
        dentist: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    return appointment;
  }

  async update(id: number, updateAppointmentDto: UpdateAppointmentDto, userRole: string) {
    const appointment = await this.findOne(id);

    // Check if user has permission to update status
    if (updateAppointmentDto.status && updateAppointmentDto.status !== appointment.status) {
      const allowedRoles = [Role.MAIN_DOCTOR, Role.DENTIST, Role.RECEPTIONIST];
      if (!allowedRoles.includes(userRole as Role)) {
        throw new UnauthorizedException('You do not have permission to update appointment status');
      }

      // Additional validation for status transitions
      if (appointment.status === 'COMPLETED' && updateAppointmentDto.status !== 'COMPLETED') {
        throw new BadRequestException('Cannot change status of a completed appointment');
      }

      if (appointment.status === 'CANCELLED' && updateAppointmentDto.status !== 'CANCELLED') {
        throw new BadRequestException('Cannot change status of a cancelled appointment');
      }
    }

    return this.prisma.appointment.update({
      where: { id },
      data: updateAppointmentDto,
      include: {
        customer: true,
        dentist: true,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.appointment.delete({
      where: { id },
    });
  }

  async getDentistAppointments(dentistId: number) {
    return this.prisma.appointment.findMany({
      where: { dentistId },
      include: {
        customer: true,
      },
    });
  }

  async getAllAppointments() {
    return this.prisma.appointment.findMany();
  }

  async getAppointmentById(id: string) {
    const appointmentId = parseInt(id, 10);
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }

  async cancelAppointment(id: string) {
    const appointmentId = parseInt(id, 10);
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return this.prisma.appointment.delete({
      where: { id: appointmentId },
    });
  }

  async blockTimeSlot(dentistId: number, blockSlotDto: BlockSlotDto) {
    if (!dentistId) {
      throw new BadRequestException('Dentist ID is required');
    }

    // First check if the dentist exists and is actually a dentist
    const dentist = await this.prisma.user.findUnique({
      where: { 
        id: dentistId 
      },
      include: { role: true }
    });

    if (!dentist) {
      throw new NotFoundException('Dentist not found');
    }

    if (dentist.role.name !== Role.DENTIST) {
      throw new UnauthorizedException('Only dentists can block time slots');
    }

    // Check if there are any existing appointments for this time slot
    const existingAppointment = await this.prisma.appointment.findFirst({
      where: {
        dentistId,
        appointmentDate: new Date(blockSlotDto.date),
        status: { not: AppointmentStatus.CANCELLED }
      }
    });

    if (existingAppointment) {
      throw new BadRequestException('Cannot block time slot with existing appointments');
    }

    // Create the blocked slot
    return this.prisma.blockedSlot.create({
      data: {
        date: new Date(blockSlotDto.date),
        startTime: blockSlotDto.startTime,
        endTime: blockSlotDto.endTime,
        reason: blockSlotDto.reason,
        dentist: {
          connect: { id: dentistId }
        }
      }
    });
  }

  async unblockTimeSlot(dentistId: number, slotId: string) {
    const blockedSlot = await this.prisma.blockedSlot.findUnique({
      where: { id: slotId }
    });

    if (!blockedSlot) {
      throw new NotFoundException('Blocked slot not found');
    }

    if (blockedSlot.dentistId !== dentistId) {
      throw new UnauthorizedException('You can only unblock your own time slots');
    }

    return this.prisma.blockedSlot.delete({
      where: { id: slotId }
    });
  }

  async getBlockedSlots(dentistId: number, startDate?: string, endDate?: string) {
    const where = {
      dentistId,
      ...(startDate && endDate ? {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      } : {})
    };

    return this.prisma.blockedSlot.findMany({
      where,
      orderBy: {
        date: 'asc'
      }
    });
  }

  async getAvailability(dentistId: number, startDate?: string, endDate?: string) {
    // Get blocked slots
    const blockedSlots = await this.getBlockedSlots(dentistId, startDate, endDate);

    // Get appointments
    const appointments = await this.prisma.appointment.findMany({
      where: {
        dentistId,
        status: { not: AppointmentStatus.CANCELLED },
        ...(startDate && endDate ? {
          appointmentDate: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        } : {})
      },
      orderBy: {
        appointmentDate: 'asc'
      }
    });

    return {
      blockedSlots,
      appointments
    };
  }

  async unblockSlot(id: string) {
    const blockedSlot = await this.prisma.blockedSlot.findUnique({
      where: { id },
    });

    if (!blockedSlot) {
      throw new NotFoundException(`Blocked slot with ID ${id} not found`);
    }

    return this.prisma.blockedSlot.delete({
      where: { id },
    });
  }

  async getReceptionistAppointments() {
    const appointments = await this.prisma.appointment.findMany({
      include: {
        customer: {
          select: {
            name: true,
            email: true,
          }
        },
        dentist: {
          select: {
            name: true,
          }
        }
      },
      orderBy: {
        appointmentDate: 'desc'
      }
    });
    console.log('Receptionist appointments:', appointments);
    return appointments;
  }

  async getCustomerAppointments(customerId: number) {
    return this.prisma.appointment.findMany({
      where: { customerId },
      include: {
        dentist: {
          select: {
            name: true,
          }
        }
      },
      orderBy: {
        appointmentDate: 'desc'
      }
    });
  }

  private async isSlotBlocked(date: Date, startTime: string, endTime: string) {
    const blockedSlot = await this.prisma.blockedSlot.findFirst({
      where: {
        date,
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gte: startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lte: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
        ],
      },
    });

    return !!blockedSlot;
  }
}

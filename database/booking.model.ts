import { Schema, model, models, type Model, Types } from 'mongoose';
import Event from './event.model';

export interface IBooking {
    eventId: Types.ObjectId;
    email: string;
    createdAt: Date;
    updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
    {
        eventId: {
            type: Schema.Types.ObjectId,
            ref: 'Event',
            required: true,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'email must be valid'],
        },
    },
    { timestamps: true }
);

BookingSchema.pre('save', async function () {
    // Keep email normalized before storage.
    this.email = this.email.trim().toLowerCase();
    if (!this.email) {
        throw new Error('email is required');
    }

    // Prevent orphan bookings by checking the referenced event exists.
    if (this.isNew || this.isModified('eventId')) {
        const eventExists = await Event.exists({ _id: this.eventId });
        if (!eventExists) {
            throw new Error('Referenced event does not exist');
        }
    }
});

BookingSchema.index({ eventId: 1 });

const Booking: Model<IBooking> =
    (models.Booking as Model<IBooking>) || model<IBooking>('Booking', BookingSchema);

export default Booking;

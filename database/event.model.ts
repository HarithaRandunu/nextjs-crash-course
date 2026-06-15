import { Schema, model, models, type Model } from 'mongoose';

export interface IEvent {
    title: string;
    slug: string;
    description: string;
    overview: string;
    image: string;
    venue: string;
    location: string;
    date: string;
    time: string;
    mode: string;
    audience: string;
    agenda: string[];
    organizer: string;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
    {
        title: { type: String, required: true, trim: true },
        slug: { type: String, unique: true, trim: true, lowercase: true },
        description: { type: String, required: true, trim: true },
        overview: { type: String, required: true, trim: true },
        image: { type: String, required: true, trim: true },
        venue: { type: String, required: true, trim: true },
        location: { type: String, required: true, trim: true },
        date: { type: String, required: true, trim: true },
        time: { type: String, required: true, trim: true },
        mode: { type: String, required: true, trim: true },
        audience: { type: String, required: true, trim: true },
        agenda: { type: [String], required: true },
        organizer: { type: String, required: true, trim: true },
        tags: { type: [String], required: true },
    },
    { timestamps: true }
);

const requiredStringFields = [
    'title',
    'description',
    'overview',
    'image',
    'venue',
    'location',
    'date',
    'time',
    'mode',
    'audience',
    'organizer',
] as const;

/**
 * Validates that a string is non-empty after trimming and returns the trimmed value.
 *
 * @param value - The string to validate and trim
 * @param fieldName - The name of the field being validated, used in error messages
 * @returns The trimmed string
 * @throws Error if the trimmed string is empty
 */
function ensureNonEmpty(value: string, fieldName: string): string {
    const normalized = value.trim();
    if (!normalized) {
        throw new Error(`${fieldName} is required`);
    }
    return normalized;
}

/**
 * Converts a title string to a URL-friendly slug.
 *
 * @returns A lowercase slug with whitespace and special characters converted to hyphens.
 */
function slugify(title: string): string {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Converts a date value to its ISO 8601 string representation.
 *
 * @param dateValue - The date value to normalize
 * @returns The ISO 8601 string representation of the date
 * @throws If the date value is invalid
 */
function normalizeDateToIso(dateValue: string): string {
    // Expect ISO 8601 date format (YYYY-MM-DD or full ISO string)
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/;
    if (!isoDatePattern.test(dateValue.trim())) {
        throw new Error('date must be in ISO 8601 format (YYYY-MM-DD)');
    }
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error('date must be a valid date value');
    }
    return parsed.toISOString();
}

/**
 * Normalizes a time string to 24-hour HH:MM format.
 *
 * Accepts both 12-hour (HH:MM AM/PM) and 24-hour (HH:MM) formats and converts
 * them to a canonical 24-hour representation with zero-padded hour and minute.
 *
 * @param timeValue - The time string to normalize
 * @returns A time string in 24-hour HH:MM format
 * @throws Error if the time format is invalid, minutes are outside 00–59, or hours are outside valid ranges
 */
function normalizeTimeValue(timeValue: string): string {
    const match = timeValue.trim().match(/^(\d{1,2}):(\d{2})(?:\s*([aApP][mM]))?$/);
    if (!match) {
        throw new Error('time must use HH:MM or HH:MM AM/PM format');
    }

    let hours = Number.parseInt(match[1], 10);
    const minutes = Number.parseInt(match[2], 10);
    const period = match[3]?.toUpperCase();

    if (minutes < 0 || minutes > 59) {
        throw new Error('time minutes must be between 00 and 59');
    }

    if (period) {
        if (hours < 1 || hours > 12) {
            throw new Error('12-hour time must use hours between 1 and 12');
        }
        if (period === 'PM' && hours !== 12) {
            hours += 12;
        }
        if (period === 'AM' && hours === 12) {
            hours = 0;
        }
    } else if (hours < 0 || hours > 23) {
        throw new Error('24-hour time must use hours between 00 and 23');
    }

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

EventSchema.pre('save', function () {
    // Validate required strings and keep canonical trimmed values.
    for (const field of requiredStringFields) {
        this[field] = ensureNonEmpty(this[field], field);
    }

    // Ensure list fields are present and non-empty.
    this.agenda = (this.agenda ?? []).map((item) => ensureNonEmpty(item, 'agenda item'));
    this.tags = (this.tags ?? []).map((item) => ensureNonEmpty(item, 'tag'));
    if (this.agenda.length === 0) {
        throw new Error('agenda is required');
    }
    if (this.tags.length === 0) {
        throw new Error('tags are required');
    }

    // Regenerate slug only when title changes.
    if (this.isNew || this.isModified('title')) {
        this.slug = slugify(this.title);
    }

    // Normalize date and time into consistent formats.
    if (this.isNew || this.isModified('date')) {
        this.date = normalizeDateToIso(this.date);
    }
    if (this.isNew || this.isModified('time')) {
        this.time = normalizeTimeValue(this.time);
    }
});

EventSchema.index({ slug: 1 }, { unique: true });

const Event: Model<IEvent> = (models.Event as Model<IEvent>) || model<IEvent>('Event', EventSchema);

export default Event;

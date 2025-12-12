interface CalendarConfig {
  accessToken: string;
}

interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{ email: string }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{ method: string; minutes: number }>;
  };
}

interface CalendarResponse {
  success: boolean;
  event?: CalendarEvent;
  error?: string;
}

const CALENDAR_API_URL = 'https://www.googleapis.com/calendar/v3';

export async function createCalendarEvent(
  config: CalendarConfig,
  event: CalendarEvent,
  calendarId: string = 'primary'
): Promise<CalendarResponse> {
  try {
    const response = await fetch(
      `${CALENDAR_API_URL}/calendars/${calendarId}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error?.message || 'Failed to create event' };
    }

    const data = await response.json();
    return { success: true, event: data };
  } catch (error) {
    return { success: false, error: 'Failed to create calendar event' };
  }
}

export async function updateCalendarEvent(
  config: CalendarConfig,
  eventId: string,
  event: Partial<CalendarEvent>,
  calendarId: string = 'primary'
): Promise<CalendarResponse> {
  try {
    const response = await fetch(
      `${CALENDAR_API_URL}/calendars/${calendarId}/events/${eventId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error?.message };
    }

    const data = await response.json();
    return { success: true, event: data };
  } catch (error) {
    return { success: false, error: 'Failed to update calendar event' };
  }
}

export async function deleteCalendarEvent(
  config: CalendarConfig,
  eventId: string,
  calendarId: string = 'primary'
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${CALENDAR_API_URL}/calendars/${calendarId}/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
        },
      }
    );

    if (!response.ok && response.status !== 204) {
      const error = await response.json();
      return { success: false, error: error.error?.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to delete calendar event' };
  }
}

export async function listCalendarEvents(
  config: CalendarConfig,
  calendarId: string = 'primary',
  timeMin?: string,
  timeMax?: string,
  maxResults: number = 50
): Promise<{ success: boolean; events?: CalendarEvent[]; error?: string }> {
  try {
    const params = new URLSearchParams({
      maxResults: String(maxResults),
      singleEvents: 'true',
      orderBy: 'startTime',
    });

    if (timeMin) params.set('timeMin', timeMin);
    if (timeMax) params.set('timeMax', timeMax);

    const response = await fetch(
      `${CALENDAR_API_URL}/calendars/${calendarId}/events?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error?.message };
    }

    const data = await response.json();
    return { success: true, events: data.items || [] };
  } catch (error) {
    return { success: false, error: 'Failed to list calendar events' };
  }
}

export async function syncEventsWithRomna(
  config: CalendarConfig,
  romnaEvents: Array<{ id: string; title: string; date: string; description?: string; location?: string }>,
  calendarId: string = 'primary'
): Promise<{ success: boolean; synced: number; error?: string }> {
  try {
    let synced = 0;
    
    for (const event of romnaEvents) {
      const calendarEvent: CalendarEvent = {
        summary: event.title,
        description: event.description,
        location: event.location,
        start: {
          dateTime: event.date,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: new Date(new Date(event.date).getTime() + 60 * 60 * 1000).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      };

      const result = await createCalendarEvent(config, calendarEvent, calendarId);
      if (result.success) synced++;
    }

    return { success: true, synced };
  } catch (error) {
    return { success: false, synced: 0, error: 'Failed to sync events' };
  }
}

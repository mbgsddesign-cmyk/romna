const NOTION_API_URL = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

interface NotionConfig {
  accessToken: string;
}

interface NotionDatabase {
  id: string;
  title: string;
  properties: Record<string, unknown>;
}

interface TaskData {
  title: string;
  description?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'pending' | 'done';
}

interface EventData {
  title: string;
  description?: string;
  date: string;
  location?: string;
}

interface NotionResponse {
  success: boolean;
  pageId?: string;
  error?: string;
}

export async function validateNotionToken(config: NotionConfig): Promise<{ success: boolean; workspace?: string; error?: string }> {
  try {
    const response = await fetch(`${NOTION_API_URL}/users/me`, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Notion-Version': NOTION_VERSION,
      },
    });

    if (!response.ok) {
      return { success: false, error: 'Invalid token' };
    }

    const data = await response.json();
    return { success: true, workspace: data.name };
  } catch (error) {
    return { success: false, error: 'Failed to validate token' };
  }
}

export async function listDatabases(config: NotionConfig): Promise<{ success: boolean; databases?: NotionDatabase[]; error?: string }> {
  try {
    const response = await fetch(`${NOTION_API_URL}/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: { property: 'object', value: 'database' },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message };
    }

    const data = await response.json();
    const databases = data.results.map((db: Record<string, unknown>) => ({
      id: db.id,
      title: (db.title as Array<{ plain_text: string }>)?.[0]?.plain_text || 'Untitled',
      properties: db.properties,
    }));

    return { success: true, databases };
  } catch (error) {
    return { success: false, error: 'Failed to list databases' };
  }
}

export async function createTaskInNotion(
  config: NotionConfig,
  databaseId: string,
  task: TaskData
): Promise<NotionResponse> {
  try {
    const properties: Record<string, unknown> = {
      Name: {
        title: [{ text: { content: task.title } }],
      },
    };

    if (task.description) {
      properties['Description'] = {
        rich_text: [{ text: { content: task.description } }],
      };
    }

    if (task.dueDate) {
      properties['Due Date'] = {
        date: { start: task.dueDate },
      };
    }

    if (task.priority) {
      properties['Priority'] = {
        select: { name: task.priority.charAt(0).toUpperCase() + task.priority.slice(1) },
      };
    }

    if (task.status) {
      properties['Status'] = {
        status: { name: task.status === 'done' ? 'Done' : 'To Do' },
      };
    }

    const response = await fetch(`${NOTION_API_URL}/pages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message };
    }

    const data = await response.json();
    return { success: true, pageId: data.id };
  } catch (error) {
    return { success: false, error: 'Failed to create task in Notion' };
  }
}

export async function createEventInNotion(
  config: NotionConfig,
  databaseId: string,
  event: EventData
): Promise<NotionResponse> {
  try {
    const properties: Record<string, unknown> = {
      Name: {
        title: [{ text: { content: event.title } }],
      },
      Date: {
        date: { start: event.date },
      },
    };

    if (event.description) {
      properties['Description'] = {
        rich_text: [{ text: { content: event.description } }],
      };
    }

    if (event.location) {
      properties['Location'] = {
        rich_text: [{ text: { content: event.location } }],
      };
    }

    const response = await fetch(`${NOTION_API_URL}/pages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message };
    }

    const data = await response.json();
    return { success: true, pageId: data.id };
  } catch (error) {
    return { success: false, error: 'Failed to create event in Notion' };
  }
}

export async function queryDatabase(
  config: NotionConfig,
  databaseId: string,
  filter?: Record<string, unknown>
): Promise<{ success: boolean; results?: unknown[]; error?: string }> {
  try {
    const response = await fetch(`${NOTION_API_URL}/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filter }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message };
    }

    const data = await response.json();
    return { success: true, results: data.results };
  } catch (error) {
    return { success: false, error: 'Failed to query database' };
  }
}

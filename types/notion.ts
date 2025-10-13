export interface NotionTask {
  id: string;
  title: string;
  status: 'In Progress' | 'Done' | 'Not Started';
  assignee?: string;
  assigneeId?: string;
  assign?: string;
  team?: string;
  dueDate?: string;
  createdDate: string;
  lastModified: string;
  priority?: 'Low' | 'Medium' | 'High';
  description?: string;
}

export interface NotionDatabase {
  id: string;
  title: string;
  properties: Record<string, any>;
}

export interface FilterOptions {
  team?: string;
  assignee?: string;
  status?: string;
  sortBy?: 'dueDate' | 'createdDate' | 'lastModified' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface NotionPage {
  id: string;
  created_time: string;
  last_edited_time: string;
  properties: {
    [key: string]: any;
  };
}
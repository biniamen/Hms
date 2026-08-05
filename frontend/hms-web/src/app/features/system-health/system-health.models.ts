export interface ServiceStatus {
  id: string;
  name: string;
  url: string;
  description: string;
  projectPath: string;
  status: string;
  canStart: boolean;
}

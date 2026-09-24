/**
 * Local Workflow Persistence using IndexedDB.
 * Stores workflow recipes and execution histories completely client-side.
 */
import { openLocalDatabase, WORKFLOWS_STORE } from './indexedDb';

export interface WorkflowStepConfig {
  type:
    | 'rotate'
    | 'reverse'
    | 'remove-blank'
    | 'page-numbers'
    | 'watermark'
    | 'stamp'
    | 'crop'
    | 'resize'
    | 'flatten-forms'
    | 'compress';
  name: string;
  enabled: boolean;
  params: Record<string, any>;
}

export interface SavedWorkflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStepConfig[];
  createdAt: number;
  updatedAt: number;
}

export const DEFAULT_PRESET_WORKFLOWS: SavedWorkflow[] = [
  {
    id: 'preset-standardize-and-brand',
    name: 'Clean, Number & Watermark',
    description: 'Remove blank spacer pages, apply sequential page numbers in footer, and stamp draft watermark.',
    steps: [
      {
        type: 'remove-blank',
        name: 'Remove Blank Pages',
        enabled: true,
        params: {},
      },
      {
        type: 'page-numbers',
        name: 'Add Footer Page Numbers',
        enabled: true,
        params: {
          position: 'bottom-center',
          format: 'page-of-total',
          startIndex: 1,
          prefix: 'Page ',
          suffix: '',
          fontSize: 10,
          margin: 30,
        },
      },
      {
        type: 'watermark',
        name: 'Add Confidential Stamp',
        enabled: true,
        params: {
          text: 'CONFIDENTIAL',
          fontSize: 48,
          opacity: 0.15,
          angle: 45,
          color: '#DC2626',
        },
      },
      {
        type: 'compress',
        name: 'Compress Output',
        enabled: true,
        params: {
          stripMetadata: false,
          compressStreams: true,
        },
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'preset-flatten-secure',
    name: 'Form Lock & Optimize',
    description: 'Flatten interactive form fields into non-editable vector graphics and optimize file size.',
    steps: [
      {
        type: 'flatten-forms',
        name: 'Flatten AcroForms',
        enabled: true,
        params: {},
      },
      {
        type: 'compress',
        name: 'Optimize Object Streams',
        enabled: true,
        params: {
          stripMetadata: true,
          compressStreams: true,
        },
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

export class WorkflowRepository {
  static async getAllWorkflows(): Promise<SavedWorkflow[]> {
    try {
      const db = await openLocalDatabase();
      return new Promise((resolve) => {
        const transaction = db.transaction([WORKFLOWS_STORE], 'readonly');
        const store = transaction.objectStore(WORKFLOWS_STORE);
        const request = store.getAll();

        request.onsuccess = () => {
          const userWorkflows: SavedWorkflow[] = request.result || [];
          // If empty, return default presets combined with user workflows
          if (userWorkflows.length === 0) {
            resolve(DEFAULT_PRESET_WORKFLOWS);
          } else {
            resolve([...DEFAULT_PRESET_WORKFLOWS, ...userWorkflows]);
          }
        };

        request.onerror = () => {
          console.error('Failed reading workflows from IndexedDB, falling back to defaults:', request.error);
          resolve(DEFAULT_PRESET_WORKFLOWS);
        };
      });
    } catch (e) {
      console.warn('IndexedDB not available for workflows:', e);
      return DEFAULT_PRESET_WORKFLOWS;
    }
  }

  static async saveWorkflow(workflow: SavedWorkflow): Promise<void> {
    const db = await openLocalDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([WORKFLOWS_STORE], 'readwrite');
      const store = transaction.objectStore(WORKFLOWS_STORE);
      const request = store.put({
        ...workflow,
        updatedAt: Date.now(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  static async deleteWorkflow(id: string): Promise<void> {
    const db = await openLocalDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([WORKFLOWS_STORE], 'readwrite');
      const store = transaction.objectStore(WORKFLOWS_STORE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export type StoredWorkflow = SavedWorkflow;

export type WorkflowStep = {
  id: string;
  action: string;
  name: string;
  params: Record<string, any>;
};

export const workflowRepository = {
  getAll: WorkflowRepository.getAllWorkflows,
  save: async (wf: { name: string; description?: string; steps: any[] }): Promise<SavedWorkflow> => {
    const full: SavedWorkflow = {
      id: `wf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: wf.name,
      description: wf.description || '',
      steps: wf.steps,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await WorkflowRepository.saveWorkflow(full);
    return full;
  },
  delete: WorkflowRepository.deleteWorkflow,
};

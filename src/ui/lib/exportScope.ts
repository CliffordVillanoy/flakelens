import { create } from 'zustand';
import type { Scope } from '../data/exportData';

// The Export menu's scope choice, remembered while the person stays on the page (it starts as Current view and is not saved).
export const useExportScope = create<{ scope: Scope }>(() => ({ scope: 'view' }));

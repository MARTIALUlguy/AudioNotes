/**
 * Exports du module de synchronisation
 */

export {
  syncPendingRecordings,
  startPollingForResults,
  stopAllPolling,
  getActivePollingCount,
  getSyncStatus,
  retrySyncErrors
} from './syncManager'

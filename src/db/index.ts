// IndexedDB Audio Database
export {
  saveRecording,
  getAllRecordings,
  getRecordingsByStatus,
  getRecording,
  updateRecordingStatus,
  updateRecordingResult,
  deleteRecording,
  deleteAllRecordings,
  countRecordings,
  countRecordingsByStatus,
  exportRecordings,
  testConnection,
} from './audioDb'

export type { AudioRecording } from './audioDb'

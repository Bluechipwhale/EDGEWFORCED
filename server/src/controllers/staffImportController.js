import multer from 'multer';
import { STAFF_IMPORT_HEADERS, previewStaffImport, importStaffFile } from '../services/staffFileImportService.js';

const uploadFile = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } }).single('file');
export function staffImportUpload(req, res, next) {
  uploadFile(req, res, error => error ? res.status(400).json({ success: false, error: { message: error.code === 'LIMIT_FILE_SIZE' ? 'Staff files must be 5 MB or smaller.' : error.message } }) : next());
}
export const staffImportController = {
  template(req, res) {
    res.type('text/csv').attachment('staff-import-template.csv').send(STAFF_IMPORT_HEADERS.join(',') + '\r\n');
  },
  async preview(req, res) {
    try { res.json({ success: true, data: await previewStaffImport(req.file, req.user, req.body) }); }
    catch (error) { res.status(400).json({ success: false, error: { message: error.message } }); }
  },
  async commit(req, res) {
    try { res.json({ success: true, data: await importStaffFile(req.file, req.user, req.body, req) }); }
    catch (error) { res.status(400).json({ success: false, error: { message: error.message } }); }
  }
};

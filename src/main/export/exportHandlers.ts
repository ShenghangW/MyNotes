import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { BrowserWindow, dialog, ipcMain } from 'electron'
import type { NoteExportPdfInput } from '../../shared/api'
import { IPC_CHANNELS } from '../../shared/api'
import { fail, ok } from '../ipc/result'
import { buildPrintHtml, safeFileName } from './printHtml'

/** Prints an HTML page to PDF in a hidden window (scripts disabled, nothing from the network). */
async function renderPdf(html: string): Promise<Buffer> {
  const dir = mkdtempSync(join(tmpdir(), 'mynote-pdf-'))
  const file = join(dir, 'note.html')
  writeFileSync(file, html, 'utf8')
  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true, javascript: false, contextIsolation: true }
  })
  try {
    await printWindow.loadFile(file)
    return await printWindow.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true
    })
  } finally {
    printWindow.destroy()
    rmSync(dir, { recursive: true, force: true })
  }
}

export function registerExportHandlers(userDataRoot: string): void {
  ipcMain.handle(IPC_CHANNELS.notesExportPdf, async (event, input?: NoteExportPdfInput) => {
    try {
      if (!input || typeof input.title !== 'string' || typeof input.html !== 'string') {
        throw new Error('Nothing to export')
      }
      const parent = BrowserWindow.fromWebContents(event.sender)
      const options = {
        title: 'Export note as PDF',
        defaultPath: `${safeFileName(input.title)}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      }
      const chosen = parent
        ? await dialog.showSaveDialog(parent, options)
        : await dialog.showSaveDialog(options)
      if (chosen.canceled || !chosen.filePath) {
        return ok<string | null>(null)
      }

      const html = buildPrintHtml({ title: input.title, bodyHtml: input.html, userDataRoot })
      writeFileSync(chosen.filePath, await renderPdf(html))
      return ok<string | null>(chosen.filePath)
    } catch (error) {
      return fail(error)
    }
  })
}

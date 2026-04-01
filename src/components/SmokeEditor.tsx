import { useMemo, useRef } from 'react'
import { locale } from '../locales'
import type { SmokeTemplate } from '../types'

interface SmokeEditorProps {
  title: string
  createLabel: string
  selectLabel: string
  templates: SmokeTemplate[]
  selectedTemplateId: string | null
  validationErrors: string[]
  notice: string | null
  isDirty: boolean
  onSelectTemplate: (id: string) => void
  onCreateTemplate: () => void
  onDuplicateTemplate: (id: string) => void
  onDeleteTemplate: (id: string) => void
  onSaveTemplate: () => void
  onCancelChanges: () => void
  onUpdateTemplateName: (id: string, name: string) => void
  onAddStep: (id: string) => void
  onDeleteStep: (id: string, stepIndex: number) => void
  onMoveStep: (id: string, stepIndex: number, direction: 'up' | 'down') => void
  onUpdateStepTitle: (id: string, stepIndex: number, title: string) => void
  onAddCheck: (id: string, stepIndex: number) => void
  onUpdateCheck: (id: string, stepIndex: number, checkIndex: number, value: string) => void
  onDeleteCheck: (id: string, stepIndex: number, checkIndex: number) => void
  onImportJson: (file: File) => void
  onExportJson: () => void
  onImportExcel: (file: File) => void
  onExportExcel: () => void
  onRestoreBackup: () => void
  onExportBackup: () => void
}

export function SmokeEditor({
  title,
  createLabel,
  selectLabel,
  templates,
  selectedTemplateId,
  validationErrors,
  notice,
  isDirty,
  onSelectTemplate,
  onCreateTemplate,
  onDuplicateTemplate,
  onDeleteTemplate,
  onSaveTemplate,
  onCancelChanges,
  onUpdateTemplateName,
  onAddStep,
  onDeleteStep,
  onMoveStep,
  onUpdateStepTitle,
  onAddCheck,
  onUpdateCheck,
  onDeleteCheck,
  onImportJson,
  onExportJson,
  onImportExcel,
  onExportExcel,
  onRestoreBackup,
  onExportBackup,
}: SmokeEditorProps) {
  const jsonInputRef = useRef<HTMLInputElement>(null)
  const excelInputRef = useRef<HTMLInputElement>(null)

  const activeTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [selectedTemplateId, templates],
  )

  return (
    <section className="smoke-editor">
      <header className="section-title">
        <h2>{title}</h2>
        <div className="template-actions editor-header-actions">
          <button className="secondary" onClick={onCreateTemplate}>
            {createLabel}
          </button>
          <label className="select-template">
            {selectLabel}
            <select
              value={selectedTemplateId ?? ''}
              onChange={(event) => onSelectTemplate(event.target.value)}
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>
          <button onClick={onSaveTemplate}>{locale.ui.actions.saveChanges}</button>
          <button className="secondary" onClick={onCancelChanges} disabled={!isDirty}>
            {locale.ui.actions.cancelChanges}
          </button>
        </div>
      </header>

      <p className="meta">{locale.ui.messages.editorHint}</p>
      {isDirty && <p className="notice">{locale.ui.messages.unsavedChanges}</p>}

      <div className="editor-tools editor-panel">
        <strong className="editor-panel__title">{locale.ui.sections.editorTools}</strong>
        <button className="secondary" onClick={() => jsonInputRef.current?.click()}>
          {locale.ui.actions.importJson}
        </button>
        <button className="secondary" onClick={onExportJson}>
          {locale.ui.actions.exportJson}
        </button>
        <button className="secondary" onClick={() => excelInputRef.current?.click()}>
          {locale.ui.actions.importExcel}
        </button>
        <button className="secondary" onClick={onExportExcel}>
          {locale.ui.actions.exportExcel}
        </button>
        <button className="secondary" onClick={onRestoreBackup}>
          {locale.ui.actions.restoreBackup}
        </button>
        <button className="secondary" onClick={onExportBackup}>
          {locale.ui.actions.exportBackup}
        </button>
      </div>

      <input
        ref={jsonInputRef}
        type="file"
        accept="application/json"
        className="hidden-input"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            onImportJson(file)
          }
          event.target.value = ''
        }}
      />

      <input
        ref={excelInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden-input"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            onImportExcel(file)
          }
          event.target.value = ''
        }}
      />

      {notice && <p className="notice">{notice}</p>}

      {validationErrors.length > 0 && (
        <div className="validation-errors">
          <strong>{locale.ui.messages.validationTitle}</strong>
          <ul>
            {validationErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {!activeTemplate && <p>{locale.ui.messages.selectTemplate}</p>}

      {activeTemplate && (
        <div className="template-editor">
          <div className="editor-panel">
            <strong className="editor-panel__title">{locale.ui.labels.templateName}</strong>
            <label>
              {locale.ui.labels.templateName}
              <input
                value={activeTemplate.name}
                onChange={(event) => onUpdateTemplateName(activeTemplate.id, event.target.value)}
              />
            </label>

            <div className="template-actions">
              <button className="secondary" onClick={() => onDuplicateTemplate(activeTemplate.id)}>
                {locale.ui.actions.duplicateTemplate}
              </button>
              <button className="secondary" onClick={() => onDeleteTemplate(activeTemplate.id)}>
                {locale.ui.actions.deleteTemplate}
              </button>
            </div>
          </div>

          <div className="step-editor-list editor-panel">
            <strong className="editor-panel__title">{locale.ui.labels.stepName}</strong>
            {activeTemplate.steps.map((step, stepIndex) => (
              <article key={step.id} className="step-editor-card">
                <div className="step-editor-card__header">
                  <strong>
                    {locale.ui.labels.step} {stepIndex + 1}
                  </strong>
                </div>

                <label>
                  {locale.ui.labels.stepName}
                  <input
                    value={step.title}
                    onChange={(event) =>
                      onUpdateStepTitle(activeTemplate.id, stepIndex, event.target.value)
                    }
                  />
                </label>

                <div className="template-actions">
                  <button
                    className="secondary"
                    onClick={() => onMoveStep(activeTemplate.id, stepIndex, 'up')}
                    disabled={stepIndex === 0}
                  >
                    {locale.ui.actions.moveStepUp}
                  </button>
                  <button
                    className="secondary"
                    onClick={() => onMoveStep(activeTemplate.id, stepIndex, 'down')}
                    disabled={stepIndex === activeTemplate.steps.length - 1}
                  >
                    {locale.ui.actions.moveStepDown}
                  </button>
                  <button
                    className="secondary"
                    onClick={() => onDeleteStep(activeTemplate.id, stepIndex)}
                  >
                    {locale.ui.actions.deleteStep}
                  </button>
                </div>

                <div className="step-checks-block">
                  <strong className="step-checks-title">{locale.ui.labels.checklist}</strong>
                  {step.checks.map((check, checkIndex) => (
                    <label key={`${step.id}-${checkIndex}`}>
                      {locale.ui.labels.checkName}
                      <div className="check-row">
                        <input
                          value={check}
                          onChange={(event) =>
                            onUpdateCheck(activeTemplate.id, stepIndex, checkIndex, event.target.value)
                          }
                        />
                        <button
                          className="secondary"
                          onClick={() => onDeleteCheck(activeTemplate.id, stepIndex, checkIndex)}
                        >
                          {locale.ui.actions.deleteCheck}
                        </button>
                      </div>
                    </label>
                  ))}
                </div>

                <button
                  className="secondary"
                  onClick={() => onAddCheck(activeTemplate.id, stepIndex)}
                >
                  {locale.ui.actions.addCheck}
                </button>
              </article>
            ))}
          </div>

          <button className="secondary" onClick={() => onAddStep(activeTemplate.id)}>
            {locale.ui.actions.addStep}
          </button>
        </div>
      )}
    </section>
  )
}

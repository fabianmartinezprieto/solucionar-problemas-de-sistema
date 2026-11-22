import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Save, Trash2, Upload, X } from 'lucide-react';
import { createTutorialApi, updateTutorialApi, uploadMediaFile } from '../api';
import type {
  Tutorial,
  TutorialStep,
  UserAccount,
  VisibilityScope,
  VisibilityStatus,
} from '../types';

interface TutorialEditorProps {
  existingTutorial?: Tutorial | null;
  categories: string[];
  allUsers: UserAccount[];
  currentUser: UserAccount;
  onCancel: () => void;
  onSaved: (tutorial: Tutorial) => void;
  onNotify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const TutorialEditor: React.FC<TutorialEditorProps> = ({
  existingTutorial,
  categories,
  allUsers,
  currentUser,
  onCancel,
  onSaved,
  onNotify,
}) => {
  const [title, setTitle] = useState(existingTutorial?.title || '');
  const [category, setCategory] = useState(
    existingTutorial?.category || categories[0] || 'Sistemas informáticos'
  );
  const [status, setStatus] = useState<VisibilityStatus>(
    existingTutorial?.status || 'VISIBLE'
  );
  const [visibilityScope, setVisibilityScope] = useState<VisibilityScope>(
    existingTutorial?.visibilityScope || 'ALL'
  );
  const [allowedUserIds, setAllowedUserIds] = useState<string[]>(
    existingTutorial?.allowedUserIds || []
  );
  const [description, setDescription] = useState(existingTutorial?.description || '');
  const [steps, setSteps] = useState<TutorialStep[]>(
    existingTutorial?.steps?.length
      ? existingTutorial.steps
      : [
          { id: `step-1-${Date.now()}`, title: 'Primer paso', content: '', image: '', video: '' },
          { id: `step-2-${Date.now()}`, title: 'Segundo paso', content: '', image: '', video: '' },
          { id: `step-3-${Date.now()}`, title: 'Tercer paso', content: '', image: '', video: '' },
        ]
  );
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canUpload =
    currentUser.role === 'CREATOR' ||
    (currentUser.role === 'HELPER' && currentUser.permissions?.canUploadMedia);

  const selectableUsers = allUsers.filter((u) => u.role !== 'CREATOR');

  const updateStep = (index: number, patch: Partial<TutorialStep>) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const addStep = () => {
    const nextNum = steps.length + 1;
    setSteps((prev) => [
      ...prev,
      {
        id: `step-${Date.now()}-${nextNum}`,
        title: `Paso ${nextNum}`,
        content: '',
        image: '',
        video: '',
      },
    ]);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) {
      onNotify('El tutorial debe tener al menos un paso.', 'error');
      return;
    }
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    setSteps((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[target];
      next[target] = temp;
      return next;
    });
  };

  const handleFileChange = async (
    index: number,
    field: 'image' | 'video',
    file?: File | null
  ) => {
    if (!file) return;
    const key = `${index}-${field}`;
    setUploadingKey(key);
    try {
      const url = await uploadMediaFile(file);
      updateStep(index, { [field]: url });
      onNotify(
        field === 'video' ? 'Video subido correctamente.' : 'Imagen subida correctamente.',
        'success'
      );
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Error al subir el archivo.', 'error');
    } finally {
      setUploadingKey(null);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setAllowedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      onNotify('Ingresa un título para el tutorial.', 'error');
      return;
    }

    const validSteps = steps.filter(
      (s) => s.title.trim() || s.content.trim() || s.image?.trim() || s.video?.trim()
    );
    if (validSteps.length === 0) {
      onNotify('Agrega contenido en al menos un paso.', 'error');
      return;
    }

    if (visibilityScope === 'SELECTED' && allowedUserIds.length === 0) {
      onNotify('Selecciona al menos un usuario o cambia la visibilidad a Todos.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<Tutorial> = {
        title: title.trim(),
        category,
        description: description.trim(),
        status,
        visibilityScope,
        allowedUserIds: visibilityScope === 'SELECTED' ? allowedUserIds : [],
        steps: validSteps,
      };

      const saved = existingTutorial
        ? await updateTutorialApi(existingTutorial.id, payload)
        : await createTutorialApi(payload);

      onNotify(
        existingTutorial ? 'Tutorial actualizado correctamente.' : 'Tutorial publicado correctamente.',
        'success'
      );
      onSaved(saved);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Error al guardar el tutorial.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {existingTutorial ? 'Editar tutorial' : 'Crear nuevo tutorial'}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Redacta instrucciones claras paso a paso y adjunta imágenes o videos explicativos.
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
          Cancelar
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-8"
      >
        {/* General Info */}
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Título del tutorial
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Reparar error de actualización en Windows 11"
              className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-blue-600"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Visibilidad general
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as VisibilityStatus)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-blue-600"
              >
                <option value="VISIBLE">Visible</option>
                <option value="HIDDEN">Oculto (solo administradores)</option>
              </select>
            </div>
          </div>

          {currentUser.role === 'CREATOR' && (
            <div className="pt-2 space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                ¿Quién puede ver este tutorial?
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setVisibilityScope('ALL')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition cursor-pointer ${
                    visibilityScope === 'ALL'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  Todos los usuarios activos
                </button>
                <button
                  type="button"
                  onClick={() => setVisibilityScope('SELECTED')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition cursor-pointer ${
                    visibilityScope === 'SELECTED'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  Elegir usuarios específicos ({allowedUserIds.length})
                </button>
              </div>

              {visibilityScope === 'SELECTED' && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 max-h-48 overflow-y-auto space-y-2">
                  {selectableUsers.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      Aún no hay usuarios registrados para seleccionar.
                    </p>
                  ) : (
                    selectableUsers.map((u) => (
                      <label
                        key={u.id}
                        className="flex items-center justify-between gap-3 py-1 text-sm text-slate-700 cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={allowedUserIds.includes(u.id)}
                            onChange={() => toggleUserSelection(u.id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                          />
                          <span className="font-medium text-slate-900">
                            {u.name} {u.surname}
                          </span>
                        </span>
                        <span className="text-xs text-slate-500 font-mono tabular-nums">
                          {u.phone} · {u.status}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Descripción breve del problema
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Resume qué error resuelve este tutorial..."
              className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />
          </div>
        </div>

        {/* Dynamic Steps Builder */}
        <div className="pt-8 border-t border-slate-200 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Pasos de la solución ({steps.length})
              </h2>
              <p className="text-xs text-slate-500">
                Agrega tantos pasos como necesites (Paso 1, Paso 2, Paso 3 y más).
              </p>
            </div>

            <button
              type="button"
              onClick={addStep}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Agregar paso
            </button>
          </div>

          <div className="space-y-6">
            {steps.map((step, idx) => (
              <div
                key={step.id || idx}
                className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-blue-700 tabular-nums">
                    Paso {String(idx + 1).padStart(2, '0')}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveStep(idx, -1)}
                      disabled={idx === 0}
                      title="Subir paso"
                      className="p-1.5 rounded text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStep(idx, 1)}
                      disabled={idx === steps.length - 1}
                      title="Bajar paso"
                      className="p-1.5 rounded text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeStep(idx)}
                      title="Eliminar paso"
                      className="p-1.5 rounded text-slate-500 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  value={step.title}
                  onChange={(e) => updateStep(idx, { title: e.target.value })}
                  placeholder={`Título del paso ${idx + 1}`}
                  className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-blue-600"
                />

                <textarea
                  rows={3}
                  value={step.content}
                  onChange={(e) => updateStep(idx, { content: e.target.value })}
                  placeholder="Escribe las instrucciones detalladas para este paso..."
                  className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-blue-600"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Image input + upload */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-700">
                      Imagen (URL o subir archivo)
                    </label>
                    <input
                      type="text"
                      value={step.image || ''}
                      onChange={(e) => updateStep(idx, { image: e.target.value })}
                      placeholder="https://... o sube desde tu equipo"
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                    />
                    {canUpload && (
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        {uploadingKey === `${idx}-image` ? 'Subiendo...' : 'Subir imagen'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(idx, 'image', e.target.files?.[0])}
                        />
                      </label>
                    )}
                  </div>

                  {/* Video input + upload */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-700">
                      Video tutorial (YouTube, URL o archivo de video)
                    </label>
                    <input
                      type="text"
                      value={step.video || ''}
                      onChange={(e) => updateStep(idx, { video: e.target.value })}
                      placeholder="Enlace de YouTube o sube un video MP4/WebM"
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                    />
                    {canUpload && (
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        {uploadingKey === `${idx}-video` ? 'Subiendo video...' : 'Subir video'}
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(idx, 'video', e.target.files?.[0])}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || uploadingKey !== null}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-medium transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Guardar tutorial'}
          </button>
        </div>
      </form>
    </div>
  );
};

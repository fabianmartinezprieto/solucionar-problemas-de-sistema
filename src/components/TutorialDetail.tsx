import React, { useState } from 'react';
import { ArrowLeft, Maximize2, Pencil, Play, X } from 'lucide-react';
import { getYoutubeEmbedUrl, resolveMediaUrl } from '../api';
import type { Tutorial, UserAccount } from '../types';

interface TutorialDetailProps {
  tutorial: Tutorial;
  currentUser: UserAccount;
  onBack: () => void;
  onEdit?: (tutorial: Tutorial) => void;
}

export const TutorialDetail: React.FC<TutorialDetailProps> = ({
  tutorial,
  currentUser,
  onBack,
  onEdit,
}) => {
  const [lightbox, setLightbox] = useState<{ type: 'image' | 'video'; url: string } | null>(null);

  const canEdit =
    currentUser.role === 'CREATOR' ||
    (currentUser.role === 'HELPER' && currentUser.permissions?.canEditTutorials);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a la biblioteca
        </button>

        {canEdit && onEdit && (
          <button
            type="button"
            onClick={() => onEdit(tutorial)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition cursor-pointer"
          >
            <Pencil className="w-4 h-4" />
            Editar tutorial
          </button>
        )}
      </div>

      <article className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 space-y-8">
        <header className="space-y-3 pb-8 border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-blue-700">{tutorial.category}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{tutorial.steps.length} pasos</span>
            <span aria-hidden="true">·</span>
            <span>Publicado por {tutorial.author}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{tutorial.createdAt}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 text-balance">
            {tutorial.title}
          </h1>

          {tutorial.description && (
            <p className="text-base text-slate-600 leading-relaxed">{tutorial.description}</p>
          )}
        </header>

        <div className="space-y-8">
          {tutorial.steps.map((step, index) => {
            const imgSrc = resolveMediaUrl(step.image);
            const vidSrc = resolveMediaUrl(step.video);
            const ytEmbed = vidSrc ? getYoutubeEmbedUrl(vidSrc) : null;
            const stepNum = String(index + 1).padStart(2, '0');

            return (
              <section
                key={step.id || index}
                className={index > 0 ? 'pt-8 border-t border-slate-100 space-y-4' : 'space-y-4'}
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs font-semibold text-blue-700 tabular-nums">
                    Paso {stepNum}.
                  </span>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {step.title || `Paso ${index + 1}`}
                  </h2>
                </div>

                {step.content && (
                  <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
                    {step.content}
                  </p>
                )}

                {(imgSrc || vidSrc) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {imgSrc && (
                      <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                        <div className="relative group">
                          <img
                            src={imgSrc}
                            alt={step.title || `Imagen del paso ${index + 1}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-56 object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setLightbox({ type: 'image', url: imgSrc })}
                            className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/95 border border-slate-200 text-xs font-medium text-slate-900 shadow-sm hover:bg-white transition cursor-pointer"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            Ampliar
                          </button>
                        </div>
                      </div>
                    )}

                    {vidSrc && (
                      <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                        {ytEmbed ? (
                          <iframe
                            src={ytEmbed}
                            title={step.title || `Video paso ${index + 1}`}
                            className="w-full h-56"
                            allowFullScreen
                          />
                        ) : (
                          <div className="relative">
                            <video
                              src={vidSrc}
                              controls
                              className="w-full h-56 bg-slate-900 object-contain"
                            />
                            <button
                              type="button"
                              onClick={() => setLightbox({ type: 'video', url: vidSrc })}
                              className="mt-2 ml-3 mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5" />
                              Abrir video en pantalla ampliada
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </article>

      {/* Clean Lightbox Modal */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-5xl w-full bg-white rounded-2xl p-3 border border-slate-200 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightbox(null)}
              aria-label="Cerrar vista ampliada"
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-slate-900 flex items-center justify-center shadow-xs cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {lightbox.type === 'image' ? (
              <img
                src={lightbox.url}
                alt="Vista ampliada"
                referrerPolicy="no-referrer"
                className="w-full max-h-[82vh] object-contain rounded-xl"
              />
            ) : getYoutubeEmbedUrl(lightbox.url) ? (
              <iframe
                src={getYoutubeEmbedUrl(lightbox.url)!}
                title="Video ampliado"
                className="w-full aspect-video rounded-xl"
                allowFullScreen
              />
            ) : (
              <video
                src={lightbox.url}
                controls
                autoPlay
                className="w-full max-h-[82vh] rounded-xl bg-slate-900"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

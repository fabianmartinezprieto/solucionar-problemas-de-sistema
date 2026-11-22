import React, { useState } from 'react';
import { ArrowRight, Eye, EyeOff, FileText, Pencil, Search, Video } from 'lucide-react';
import { resolveMediaUrl } from '../api';
import type { Tutorial, UserAccount } from '../types';

interface SolutionLibraryProps {
  tutorials: Tutorial[];
  categories: string[];
  currentUser: UserAccount;
  onSelectTutorial: (tutorial: Tutorial) => void;
  onEditTutorial?: (tutorial: Tutorial) => void;
  onToggleVisibility?: (tutorial: Tutorial) => void;
}

export const SolutionLibrary: React.FC<SolutionLibraryProps> = ({
  tutorials,
  categories,
  currentUser,
  onSelectTutorial,
  onEditTutorial,
  onToggleVisibility,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const canManageTutorials =
    currentUser.role === 'CREATOR' ||
    (currentUser.role === 'HELPER' && currentUser.permissions?.canEditTutorials);

  const filtered = tutorials.filter((t) => {
    const matchesCategory = selectedCategory === 'ALL' || t.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.steps.some(
        (s) => s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q)
      );
    return matchesCategory && matchesSearch;
  });

  const getCoverImage = (tut: Tutorial): string | null => {
    for (const s of tut.steps) {
      if (s.image && s.image.trim()) return resolveMediaUrl(s.image);
    }
    return null;
  };

  const hasVideo = (tut: Tutorial): boolean => {
    return tut.steps.some((s) => Boolean(s.video && s.video.trim()));
  };

  return (
    <div className="space-y-8">
      {/* Header & Search */}
      <section className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8">
        <div className="max-w-2xl space-y-4">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 text-balance">
            Biblioteca de soluciones técnicas
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Encuentra procedimientos claros y videotutoriales paso a paso organizados por sistema y
            aplicación.
          </p>

          <div className="relative pt-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 mt-0.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por error, programa o palabra clave (ej. Excel, Windows 11, DNS)..."
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 transition"
            />
          </div>
        </div>
      </section>

      {/* Interactive Category Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setSelectedCategory('ALL')}
          className={`px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition cursor-pointer ${
            selectedCategory === 'ALL'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Todas ({tutorials.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition cursor-pointer ${
              selectedCategory === cat
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results Grid */}
      {filtered.length === 0 ? (
        <div className="py-16 px-6 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
          <FileText className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-base font-semibold text-slate-900">
            No se encontraron soluciones disponibles
          </h3>
          <p className="text-sm text-slate-600">
            Prueba con otra búsqueda o selecciona otra categoría.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((tut) => {
            const cover = getCoverImage(tut);
            const showFallback = !cover || brokenImages[tut.id];
            const videoAvailable = hasVideo(tut);

            return (
              <article
                key={tut.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-slate-300 transition"
              >
                <div>
                  {/* Clean Visual Thumbnail */}
                  <div
                    onClick={() => onSelectTutorial(tut)}
                    className="aspect-[16/10] bg-slate-50 border-b border-slate-200 overflow-hidden cursor-pointer relative group"
                  >
                    {!showFallback && cover ? (
                      <img
                        src={cover}
                        alt={tut.title}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setBrokenImages((prev) => ({ ...prev, [tut.id]: true }))
                        }
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition duration-200"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-slate-400 bg-gradient-to-br from-slate-50 to-slate-100">
                        {videoAvailable ? (
                          <Video className="w-7 h-7 text-blue-600 mb-2" />
                        ) : (
                          <FileText className="w-7 h-7 text-slate-400 mb-2" />
                        )}
                        <span className="text-xs font-medium text-slate-500 text-center line-clamp-1">
                          {tut.category}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Body with Zero-Pill Metadata */}
                  <div className="p-5 space-y-2.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      <span className="font-medium text-blue-700">{tut.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{tut.steps.length} pasos</span>
                      {videoAvailable && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Con video</span>
                        </>
                      )}
                      {canManageTutorials && tut.status === 'HIDDEN' && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-700 font-medium">Oculto</span>
                        </>
                      )}
                      {canManageTutorials && tut.visibilityScope === 'SELECTED' && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-700 font-medium">
                            Solo seleccionados ({tut.allowedUserIds.length})
                          </span>
                        </>
                      )}
                    </div>

                    <h2
                      onClick={() => onSelectTutorial(tut)}
                      className="text-base font-semibold text-slate-900 leading-snug cursor-pointer hover:text-blue-600 transition line-clamp-2"
                    >
                      {tut.title}
                    </h2>

                    <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
                      {tut.description || 'Guía paso a paso para resolver este incidente.'}
                    </p>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectTutorial(tut)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-900 hover:text-blue-600 transition cursor-pointer"
                  >
                    Ver solución
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {canManageTutorials && onEditTutorial && onToggleVisibility && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEditTutorial(tut)}
                        title="Editar tutorial"
                        className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleVisibility(tut)}
                        title={tut.status === 'VISIBLE' ? 'Ocultar tutorial' : 'Mostrar tutorial'}
                        className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                      >
                        {tut.status === 'VISIBLE' ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-amber-600" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

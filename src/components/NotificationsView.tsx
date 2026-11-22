import React, { useState } from 'react';
import { ArrowRight, Bell, Check, Play, Video, X } from 'lucide-react';
import { getYoutubeEmbedUrl, resolveMediaUrl } from '../api';
import type { Tutorial, UserAccount, VideoNotification } from '../types';

interface NotificationsViewProps {
  notifications: VideoNotification[];
  tutorials: Tutorial[];
  currentUser: UserAccount;
  onMarkRead: (notificationId: string) => void;
  onOpenTutorial: (tutorial: Tutorial) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  tutorials,
  currentUser,
  onMarkRead,
  onOpenTutorial,
}) => {
  const [activeVideoUrl, setActiveVideoUrl] = useState<{ title: string; url: string } | null>(null);

  const handleOpenNotification = (notif: VideoNotification) => {
    if (!notif.readByUserIds.includes(currentUser.id)) {
      onMarkRead(notif.id);
    }
    if (notif.tutorialId) {
      const tut = tutorials.find((t) => t.id === notif.tutorialId);
      if (tut) {
        onOpenTutorial(tut);
        return;
      }
    }
    if (notif.videoUrl) {
      setActiveVideoUrl({ title: notif.title, url: resolveMediaUrl(notif.videoUrl) });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Notificaciones de video y mensajes
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Avisos directos, videotutoriales recomendados y mensajes enviados por el administrador.
        </p>
      </div>

      {notifications.length === 0 ? (
        <div className="py-16 px-6 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
          <Bell className="w-8 h-8 text-slate-400 mx-auto" />
          <h2 className="text-base font-semibold text-slate-900">Sin notificaciones nuevas</h2>
          <p className="text-sm text-slate-600">
            Cuando el administrador publique un video o mensaje, aparecerá aquí al instante.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-200">
          {notifications.map((notif) => {
            const isRead = notif.readByUserIds.includes(currentUser.id);
            const linkedTutorial = notif.tutorialId
              ? tutorials.find((t) => t.id === notif.tutorialId)
              : undefined;

            return (
              <div
                key={notif.id}
                className={`p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                  isRead ? 'bg-white' : 'bg-blue-50/40'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-900">{notif.senderName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {new Date(notif.createdAt).toLocaleString()}
                    </span>
                    {!isRead && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-blue-700">Nueva</span>
                      </>
                    )}
                  </div>

                  <h3 className="text-base font-semibold text-slate-900">{notif.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{notif.message}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {linkedTutorial && (
                    <button
                      type="button"
                      onClick={() => handleOpenNotification(notif)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition cursor-pointer"
                    >
                      Ver tutorial
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {notif.videoUrl && !linkedTutorial && (
                    <button
                      type="button"
                      onClick={() => handleOpenNotification(notif)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Ver video
                    </button>
                  )}

                  {!isRead && (
                    <button
                      type="button"
                      onClick={() => onMarkRead(notif.id)}
                      title="Marcar como leída"
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Leída
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeVideoUrl && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setActiveVideoUrl(null)}
        >
          <div
            className="max-w-4xl w-full bg-white rounded-2xl p-4 border border-slate-200 shadow-xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Video className="w-4 h-4 text-blue-600" />
                {activeVideoUrl.title}
              </div>
              <button
                type="button"
                onClick={() => setActiveVideoUrl(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {getYoutubeEmbedUrl(activeVideoUrl.url) ? (
              <iframe
                src={getYoutubeEmbedUrl(activeVideoUrl.url)!}
                title={activeVideoUrl.title}
                className="w-full aspect-video rounded-xl"
                allowFullScreen
              />
            ) : (
              <video
                src={activeVideoUrl.url}
                controls
                autoPlay
                className="w-full max-h-[75vh] rounded-xl bg-slate-900"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MediaController,
  MediaControlBar,
  MediaPlayButton,
  MediaTimeRange,
  MediaTimeDisplay,
  MediaMuteButton,
  MediaVolumeRange,
  MediaPlaybackRateButton,
  MediaFullscreenButton,
} from 'media-chrome/react';
import type { Lesson } from '../global.d';

const POSITION_SAVE_INTERVAL_MS = 2000;
const SEEK_STEP_SEC = 15;

interface VideoPlayerProps {
  lesson: Lesson;
  getVideoUrl: () => Promise<string>;
  initialTimeSeconds?: number;
  onPositionChange?: (lessonId: string, seconds: number) => void;
  onNextLesson?: () => void;
  onPrevLesson?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export function VideoPlayer({
  lesson,
  getVideoUrl,
  initialTimeSeconds = 0,
  onPositionChange,
  onNextLesson,
  onPrevLesson,
  hasNext = false,
  hasPrev = false,
}: VideoPlayerProps) {
  const [src, setSrc] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialTimeSetRef = useRef(false);
  const skipSaveRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    initialTimeSetRef.current = false;
    getVideoUrl()
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erro ao carregar vídeo.');
      });
    return () => {
      cancelled = true;
    };
  }, [lesson.id, getVideoUrl]);

  useEffect(() => {
    if (!src || !videoRef.current) return;
    const video = videoRef.current;
    const play = () => video.play().catch(() => {});
    play();
    const onCanPlay = () => play();
    video.addEventListener('canplay', onCanPlay);
    return () => video.removeEventListener('canplay', onCanPlay);
  }, [src]);

  // Definir posição inicial ao carregar (retomar onde parou)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src || initialTimeSeconds <= 0) return;
    const seek = () => {
      if (video.duration && !initialTimeSetRef.current) {
        video.currentTime = Math.min(initialTimeSeconds, Math.max(0, video.duration - 1));
        initialTimeSetRef.current = true;
      }
    };
    video.addEventListener('loadedmetadata', seek);
    if (video.readyState >= 1) seek();
    return () => video.removeEventListener('loadedmetadata', seek);
  }, [src, initialTimeSeconds]);

  // Guardar posição periodicamente (não gravar durante seek programático)
  const savePosition = useCallback(() => {
    if (skipSaveRef.current) return;
    const video = videoRef.current;
    if (!video || video.paused || !onPositionChange) return;
    const t = Math.floor(video.currentTime);
    if (t > 0) onPositionChange(lesson.id, t);
  }, [lesson.id, onPositionChange]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onPositionChange) return;
    const onTimeUpdate = () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(savePosition, POSITION_SAVE_INTERVAL_MS);
    };
    video.addEventListener('timeupdate', onTimeUpdate);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      video.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [src, onPositionChange, savePosition]);

  const seekBack = useCallback(() => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.currentTime)) return;
    const next = Math.max(0, v.currentTime - SEEK_STEP_SEC);
    v.currentTime = next;
  }, []);

  const seekForward = useCallback(() => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.currentTime)) return;
    const dur = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 1e9;
    v.currentTime = Math.min(dur, v.currentTime + SEEK_STEP_SEC);
  }, []);

  if (error) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fecaca',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <p>{error}</p>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Verifique se o arquivo existe e se a extensão é suportada (.mp4, .webm, .mkv, etc.).
        </p>
      </div>
    );
  }

  if (!src) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
        }}
      >
        Carregando vídeo…
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      <div
        style={{
          flexShrink: 0,
          padding: '0.625rem 1.25rem',
          background: 'var(--surface-elevated)',
          borderBottom: '1px solid var(--border-subtle)',
          fontSize: '0.95rem',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ flex: 1, minWidth: 0 }}>{lesson.name}</span>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          <button
            type="button"
            onClick={onPrevLesson}
            disabled={!hasPrev}
            title="Aula anterior (tecla ←)"
            style={{
              padding: '0.4rem 0.7rem',
              fontSize: '0.85rem',
              opacity: hasPrev ? 1 : 0.5,
            }}
          >
            ← Anterior
          </button>
          <button
            type="button"
            onClick={onNextLesson}
            disabled={!hasNext}
            title="Próxima aula (tecla →)"
            style={{
              padding: '0.4rem 0.7rem',
              fontSize: '0.85rem',
              opacity: hasNext ? 1 : 0.5,
            }}
          >
            Próxima →
          </button>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}>
        <MediaController className="video-player-controller" style={{ maxWidth: '100%', width: '100%', maxHeight: '100%' }}>
          <video
            ref={videoRef}
            slot="media"
            key={lesson.id}
            src={src}
            autoPlay
            playsInline
            style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' }}
          >
            Seu navegador não suporta a reprodução de vídeo.
          </video>
          <MediaControlBar>
            <MediaPlayButton />
            <button
              type="button"
              onClick={seekBack}
              title={`Recuar ${SEEK_STEP_SEC} segundos`}
              style={{
                padding: 'var(--media-button-padding, 10px)',
                background: 'var(--media-control-background, rgb(20 20 30 / .7))',
                color: 'var(--media-text-color, rgb(238 238 238))',
                border: 'none',
                cursor: 'pointer',
                fontSize: 'var(--media-font-size, 14px)',
                fontFamily: 'inherit',
              }}
            >
              −15 s
            </button>
            <button
              type="button"
              onClick={seekForward}
              title={`Avançar ${SEEK_STEP_SEC} segundos`}
              style={{
                padding: 'var(--media-button-padding, 10px)',
                background: 'var(--media-control-background, rgb(20 20 30 / .7))',
                color: 'var(--media-text-color, rgb(238 238 238))',
                border: 'none',
                cursor: 'pointer',
                fontSize: 'var(--media-font-size, 14px)',
                fontFamily: 'inherit',
              }}
            >
              +15 s
            </button>
            <MediaTimeRange />
            <MediaTimeDisplay showDuration />
            <MediaMuteButton />
            <MediaVolumeRange />
            <MediaPlaybackRateButton />
            <MediaFullscreenButton />
          </MediaControlBar>
        </MediaController>
      </div>
    </div>
  );
}

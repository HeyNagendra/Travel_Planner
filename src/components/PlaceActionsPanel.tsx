import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Youtube, CalendarDays, Play, ExternalLink, Loader2,
  MapPin, Clock, FileDown, RefreshCw, Clapperboard, Sparkles,
} from 'lucide-react';
import type { GooglePlace } from '../types';

interface VideoItem {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: { medium: { url: string; width: number; height: number } };
    publishedAt: string;
    description: string;
  };
}

interface PlaceActionsPanelProps {
  place: GooglePlace;
  initialTab: 'vlogs' | 'calendar';
  onClose: () => void;
  isDarkMode: boolean;
}

function formatRelativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 52) return `${weeks}w ago`;
  return `${Math.floor(weeks / 52)}y ago`;
}

export default function PlaceActionsPanel({ place, initialTab, onClose, isDarkMode }: PlaceActionsPanelProps) {
  const [activeTab, setActiveTab] = useState<'vlogs' | 'calendar'>(initialTab);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  const today = new Date();
  today.setDate(today.getDate() + 7);
  const defaultDate = today.toISOString().split('T')[0];

  const [visitDate, setVisitDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('10:00');
  const [duration, setDuration] = useState('2');
  const [notes, setNotes] = useState('');
  const [calendarSuccess, setCalendarSuccess] = useState(false);

  const resolveName = (p: GooglePlace): string => {
    const raw = typeof p.displayName === 'object' ? p.displayName?.text : p.displayName;
    return raw || p.name || '';
  };

  const placeId = place.id || place.name;
  const [placeName, setPlaceName] = useState(() => resolveName(place) || place.id || 'Loading…');
  const [placeAddress, setPlaceAddress] = useState(place.formattedAddress || place.vicinity || '');

  // Fetch place fields if name isn't available yet (Places API lazy-loads displayName)
  useEffect(() => {
    const name = resolveName(place);
    if (name) {
      setPlaceName(name);
      setPlaceAddress(place.formattedAddress || place.vicinity || '');
      return;
    }
    if (typeof place.fetchFields === 'function' && place.id) {
      setPlaceName('Loading…');
      place.fetchFields({ fields: ['displayName', 'formattedAddress'] })
        .then(() => {
          setPlaceName(resolveName(place) || place.id || 'Unknown Place');
          setPlaceAddress(place.formattedAddress || '');
        })
        .catch(() => setPlaceName(place.id || 'Unknown Place'));
    } else {
      setPlaceName(place.id || 'Unknown Place');
    }
  }, [placeId]);

  const fetchVideos = useCallback(async () => {
    setLoadingVideos(true);
    setVideoError(null);
    setVideos([]);
    try {
      const res = await fetch(`/api/youtube?q=${encodeURIComponent(placeName)}`);
      const data = await res.json();
      if (data.error) {
        setVideoError(data.error.message || 'Failed to load videos');
      } else {
        setVideos(data.items || []);
      }
    } catch {
      setVideoError('Could not reach the server. Please try again.');
    } finally {
      setLoadingVideos(false);
    }
  }, [placeName]);

  // Sync tab with initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, placeId]);

  // Fetch on vlogs tab open or place change
  useEffect(() => {
    if (activeTab === 'vlogs') fetchVideos();
  }, [activeTab, placeId]);

  const handleAddToCalendar = () => {
    if (!visitDate) return;
    const [h, m] = startTime.split(':').map(Number);
    const startDt = new Date(visitDate);
    startDt.setHours(h, m, 0, 0);
    const endDt = new Date(startDt.getTime() + parseFloat(duration) * 3_600_000);

    const fmt = (d: Date) => {
      const p = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
    };

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `Visit ${placeName}`,
      dates: `${fmt(startDt)}/${fmt(endDt)}`,
      details: notes || `Visiting ${placeName} — planned via Travel Planner`,
      location: placeAddress,
      sf: 'true',
    });

    window.open(`https://calendar.google.com/calendar/render?${params}`, '_blank');
    setCalendarSuccess(true);
    setTimeout(() => setCalendarSuccess(false), 3000);
  };

  const handleExportICS = () => {
    if (!visitDate) return;
    const [h, m] = startTime.split(':').map(Number);
    const startDt = new Date(visitDate);
    startDt.setHours(h, m, 0, 0);
    const endDt = new Date(startDt.getTime() + parseFloat(duration) * 3_600_000);

    const fmt = (d: Date) => {
      const p = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
    };

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Travel Planner//EN',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@travelplanner`,
      `DTSTART:${fmt(startDt)}`,
      `DTEND:${fmt(endDt)}`,
      `SUMMARY:Visit ${placeName}`,
      `DESCRIPTION:${notes || `Visiting ${placeName}`}`,
      `LOCATION:${placeAddress}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${placeName.replace(/[^a-z0-9]/gi, '_').slice(0, 40)}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      className={`
        absolute top-0 right-0 bottom-0 z-30
        w-full sm:top-4 sm:right-4 sm:bottom-8 sm:w-[360px]
        flex flex-col rounded-none sm:rounded-2xl
        shadow-2xl overflow-hidden
        border-0 sm:border
        bg-white dark:bg-slate-900
        border-slate-200 dark:border-slate-700
      `}
    >
      {/* Gradient Header */}
      <div
        className="flex-shrink-0 px-4 pt-4 pb-3"
        style={{ background: 'linear-gradient(135deg, #4a42ff 0%, #7c3aed 100%)' }}
      >
        {/* Place info row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-start gap-2 min-w-0">
            <div className="mt-0.5 p-1.5 rounded-lg bg-white/20 shrink-0">
              <MapPin className="w-3 h-3 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm text-white leading-snug truncate tracking-tight">
                {placeName}
              </h3>
              {placeAddress && (
                <p className="text-[10px] text-white/65 truncate mt-0.5 leading-tight">
                  {placeAddress}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all active:scale-90"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1.5 p-1 bg-black/20 rounded-xl">
          {(
            [
              { key: 'vlogs', icon: Youtube, label: 'Travel Vlogs' },
              { key: 'calendar', icon: CalendarDays, label: 'Plan Trip' },
            ] as const
          ).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[11px] font-bold tracking-wide transition-all duration-200 ${
                activeTab === key
                  ? 'bg-white text-indigo-700 shadow-md'
                  : 'text-white/75 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950/40">
        <AnimatePresence mode="wait">
          {activeTab === 'vlogs' ? (
            <motion.div
              key="vlogs"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="p-3 space-y-2"
            >
              {/* Loading */}
              {loadingVideos && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center">
                      <Clapperboard className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                    </div>
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-500/40 absolute inset-0" />
                  </div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Finding travel vlogs…
                  </p>
                </div>
              )}

              {/* Error */}
              {videoError && !loadingVideos && (
                <div className="m-2 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 text-center">
                  <p className="text-sm font-bold text-rose-600 dark:text-rose-400">
                    Couldn't load vlogs
                  </p>
                  <p className="text-[11px] text-rose-500/80 dark:text-rose-500/70 mt-1 leading-relaxed">
                    {videoError}
                  </p>
                  <button
                    onClick={fetchVideos}
                    className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Try again
                  </button>
                </div>
              )}

              {/* Empty */}
              {!loadingVideos && !videoError && videos.length === 0 && (
                <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                    <Youtube className="w-6 h-6 text-slate-400 dark:text-slate-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    No vlogs found
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    Try searching for this place on YouTube directly.
                  </p>
                </div>
              )}

              {/* Video list */}
              {!loadingVideos &&
                videos.map((video, i) => (
                  <motion.a
                    key={video.id.videoId}
                    href={`https://www.youtube.com/watch?v=${video.id.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.2 }}
                    className="flex gap-3 p-2.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-indigo-600/60 hover:shadow-md hover:shadow-indigo-100/50 dark:hover:shadow-none transition-all duration-200 group"
                  >
                    {/* Thumbnail */}
                    <div className="relative shrink-0 w-[112px] h-[64px] rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700">
                      <img
                        src={video.snippet.thumbnails.medium.url}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      {/* Play overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                          <Play className="w-4 h-4 text-rose-600 fill-rose-600 translate-x-0.5" />
                        </div>
                      </div>
                      {/* YouTube badge */}
                      <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[8px] font-bold flex items-center gap-1">
                        <Youtube className="w-2.5 h-2.5" />
                        YT
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 leading-tight tracking-tight">
                        {video.snippet.title}
                      </p>
                      <div className="flex flex-col gap-0.5 mt-1">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                          {video.snippet.channelTitle}
                        </span>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-slate-400 dark:text-slate-500">
                            {formatRelativeDate(video.snippet.publishedAt)}
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-indigo-500 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                            Watch
                            <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.a>
                ))}

              {/* Footer note */}
              {!loadingVideos && videos.length > 0 && (
                <p className="text-center text-[9px] text-slate-400 dark:text-slate-600 py-2 font-medium tracking-wide uppercase">
                  Results via YouTube Data API
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="p-4 space-y-4"
            >
              {/* Date picker */}
              <div>
                <label htmlFor="visit-date" className="block text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500 mb-1.5">
                  Visit Date
                </label>
                <input
                  id="visit-date"
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm font-medium
                    bg-white dark:bg-slate-800
                    text-slate-900 dark:text-slate-100
                    border-slate-200 dark:border-slate-700
                    focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 dark:focus:border-indigo-500
                    outline-none transition-all"
                />
              </div>

              {/* Time + Duration row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500 mb-1.5">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm font-medium
                      bg-white dark:bg-slate-800
                      text-slate-900 dark:text-slate-100
                      border-slate-200 dark:border-slate-700
                      focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400
                      outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500 mb-1.5">
                    Duration
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm font-medium
                      bg-white dark:bg-slate-800
                      text-slate-900 dark:text-slate-100
                      border-slate-200 dark:border-slate-700
                      focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400
                      outline-none transition-all cursor-pointer"
                  >
                    <option value="0.5">30 min</option>
                    <option value="1">1 hour</option>
                    <option value="1.5">1.5 hours</option>
                    <option value="2">2 hours</option>
                    <option value="3">3 hours</option>
                    <option value="4">Half day</option>
                    <option value="8">Full day</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="visit-notes" className="block text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500 mb-1.5">
                  Notes <span className="normal-case font-normal">(optional)</span>
                </label>
                <textarea
                  id="visit-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={`What are you planning to do at ${placeName.split(',')[0]}?`}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm
                    bg-white dark:bg-slate-800
                    text-slate-900 dark:text-slate-100
                    placeholder:text-slate-400 dark:placeholder:text-slate-600
                    border-slate-200 dark:border-slate-700
                    focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400
                    outline-none transition-all resize-none"
                />
              </div>

              {/* Address chip */}
              {placeAddress && (
                <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] font-medium text-indigo-800 dark:text-indigo-300 leading-relaxed">
                    {placeAddress}
                  </p>
                </div>
              )}

              {/* Primary CTA */}
              <AnimatePresence mode="wait">
                {calendarSuccess ? (
                  <motion.div
                    key="success"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm"
                  >
                    <Sparkles className="w-4 h-4" />
                    Google Calendar opened!
                  </motion.div>
                ) : (
                  <motion.button
                    key="cta"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={handleAddToCalendar}
                    disabled={!visitDate}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                      font-bold text-sm text-white transition-all
                      disabled:opacity-50 disabled:pointer-events-none
                      active:scale-[0.98]
                      shadow-lg shadow-indigo-300/40 dark:shadow-none"
                    style={{ background: 'linear-gradient(135deg, #4a42ff 0%, #7c3aed 100%)' }}
                  >
                    <CalendarDays className="w-4 h-4" />
                    Add to Google Calendar
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Divider */}
              <div className="relative flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 dark:text-slate-600">
                  or
                </span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              </div>

              {/* Export ICS */}
              <button
                onClick={handleExportICS}
                disabled={!visitDate}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                  text-sm font-semibold
                  border border-slate-200 dark:border-slate-700
                  text-slate-700 dark:text-slate-300
                  bg-white dark:bg-slate-800/50
                  hover:bg-slate-50 dark:hover:bg-slate-800
                  hover:border-slate-300 dark:hover:border-slate-600
                  active:scale-[0.98] transition-all
                  disabled:opacity-50 disabled:pointer-events-none"
              >
                <FileDown className="w-4 h-4" />
                Export as .ics File
              </button>

              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/50">
                <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  The .ics file works with Apple Calendar, Outlook, and any calendar app that supports the iCalendar format.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

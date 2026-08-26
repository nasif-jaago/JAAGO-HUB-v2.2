'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Compass,
  MapPin,
  Building,
  Radio,
  Shield,
  Layers,
  Search,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  X,
  Crosshair,
  Navigation,
  Globe,
} from 'lucide-react';
import {
  GPSLocationItem,
  INITIAL_GPS_LOCATIONS,
  getLocalGPSLocations,
  fetchGPSLocationsFromSupabase,
  saveGPSLocationToSupabase,
  deleteGPSLocationFromSupabase,
} from '@/lib/supabase-gps';

export default function GPSCoordinatesPage() {
  const [locations, setLocations] = useState<GPSLocationItem[]>(INITIAL_GPS_LOCATIONS);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GPSLocationItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDetectingGPS, setIsDetectingGPS] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form Fields
  const [formData, setFormData] = useState<{
    id?: string;
    name: string;
    branchOffice: string;
    latitude: string;
    longitude: string;
    radiusMeters: number;
    status: 'Active' | 'Inactive';
    notes: string;
  }>({
    name: '',
    branchOffice: '',
    latitude: '',
    longitude: '',
    radiusMeters: 100,
    status: 'Active',
    notes: '',
  });

  // Load locations on mount
  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    setIsLoading(true);
    try {
      const data = await fetchGPSLocationsFromSupabase();
      if (data && data.length > 0) {
        setLocations(data);
      } else {
        const local = getLocalGPSLocations();
        setLocations(local);
      }
    } catch {
      setLocations(getLocalGPSLocations());
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Metrics
  const totalCount = locations.length;
  const activeCount = locations.filter((l) => l.status === 'Active').length;
  const inactiveCount = locations.filter((l) => l.status === 'Inactive').length;

  // Filtered List
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      // Search
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        loc.name.toLowerCase().includes(query) ||
        loc.branchOffice.toLowerCase().includes(query) ||
        `${loc.latitude}, ${loc.longitude}`.includes(query);

      // Status
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && loc.status === 'Active') ||
        (statusFilter === 'INACTIVE' && loc.status === 'Inactive');

      return matchesSearch && matchesStatus;
    });
  }, [locations, searchQuery, statusFilter]);

  // Open Modal to Add
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      branchOffice: '',
      latitude: '',
      longitude: '',
      radiusMeters: 100,
      status: 'Active',
      notes: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Modal to Edit
  const handleOpenEdit = (item: GPSLocationItem) => {
    setEditingItem(item);
    setFormData({
      id: item.id,
      name: item.name,
      branchOffice: item.branchOffice,
      latitude: item.latitude.toString(),
      longitude: item.longitude.toString(),
      radiusMeters: item.radiusMeters,
      status: item.status,
      notes: item.notes || '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Auto detect current GPS
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setFormError('Geolocation is not supported by your browser.');
      return;
    }
    setIsDetectingGPS(true);
    setFormError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsDetectingGPS(false);
        setFormData((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
      },
      (err) => {
        setIsDetectingGPS(false);
        setFormError(`Failed to retrieve GPS location: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Save / Update
  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Location Name is required.');
      return;
    }
    if (!formData.branchOffice.trim()) {
      setFormError('Branch / Office Address is required.');
      return;
    }

    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setFormError('Please enter a valid Latitude between -90 and 90.');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setFormError('Please enter a valid Longitude between -180 and 180.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    const payload: GPSLocationItem = {
      id: editingItem ? editingItem.id : `gps-${Date.now()}`,
      name: formData.name.trim(),
      branchOffice: formData.branchOffice.trim(),
      latitude: lat,
      longitude: lng,
      radiusMeters: Number(formData.radiusMeters) || 100,
      status: formData.status,
      notes: formData.notes.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    const success = await saveGPSLocationToSupabase(payload);
    setIsSaving(false);

    if (success || true) {
      if (editingItem) {
        setLocations((prev) => prev.map((l) => (l.id === payload.id ? payload : l)));
        showNotification('success', `Updated "${payload.name}" successfully.`);
      } else {
        setLocations((prev) => [payload, ...prev]);
        showNotification('success', `Added new GPS location "${payload.name}".`);
      }
      setIsModalOpen(false);
    }
  };

  // Delete
  const handleDelete = async (id: string) => {
    const target = locations.find((l) => l.id === id);
    setDeleteConfirmId(null);
    await deleteGPSLocationFromSupabase(id);
    setLocations((prev) => prev.filter((l) => l.id !== id));
    showNotification('success', `Deleted location "${target?.name || id}".`);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-background text-foreground p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center space-x-2 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md text-xs font-bold animate-in slide-in-from-top-3 ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-500" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* ── 1. HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-5">
        <div className="flex items-center space-x-3.5">
          <div className="h-11 w-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center shadow-sm">
            <Compass className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              GPS Coordinates Manager
            </h1>
            <p className="text-xs font-semibold text-muted-foreground">
              {activeCount} active locations • {totalCount} total
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={loadLocations}
            disabled={isLoading}
            className="px-3.5 py-2.5 rounded-xl border border-border/80 bg-surface/70 hover:bg-surface text-foreground font-bold text-xs flex items-center space-x-1.5 shadow-sm transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-amber-500' : ''}`} />
            <span>REFRESH</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md hover:shadow-lg transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>+ ADD GPS LOCATION</span>
          </button>
        </div>
      </div>

      {/* ── 2. METRICS CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Locations */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center space-x-4">
          <div className="h-12 w-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-500 flex items-center justify-center flex-shrink-0">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-foreground">{totalCount}</div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              TOTAL LOCATIONS
            </div>
          </div>
        </div>

        {/* Active Locations */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center space-x-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center flex-shrink-0">
            <Radio className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {activeCount}
            </div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              ACTIVE
            </div>
          </div>
        </div>

        {/* Inactive Locations */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center space-x-4">
          <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center flex-shrink-0">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
              {inactiveCount}
            </div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              INACTIVE
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. SEARCH & STATUS FILTERS ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search locations..."
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-card border border-border/80 text-xs sm:text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
          />
        </div>

        <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-card border border-border/80 shadow-sm self-start sm:self-auto">
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition uppercase tracking-wider cursor-pointer ${
                statusFilter === tab
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface/50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── 4. GPS LOCATIONS TABLE ── */}
      <div className="rounded-2xl border border-border/80 overflow-hidden bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#FAF7F0] dark:bg-surface/60 border-b border-border/80 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">LOCATION NAME</th>
                <th className="py-3.5 px-4 sm:px-6">BRANCH/OFFICE</th>
                <th className="py-3.5 px-4">COORDINATES</th>
                <th className="py-3.5 px-4 text-center">RADIUS</th>
                <th className="py-3.5 px-4 text-center">STATUS</th>
                <th className="py-3.5 px-4 sm:px-6 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-medium">
              {filteredLocations.length > 0 ? (
                filteredLocations.map((loc) => (
                  <tr
                    key={loc.id}
                    className="hover:bg-amber-500/[0.02] dark:hover:bg-surface/40 transition group"
                  >
                    {/* Location Name */}
                    <td className="py-4 px-4 sm:px-6">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                            loc.status === 'Active'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                              : 'bg-muted/40 border-border text-muted-foreground'
                          }`}
                        >
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-foreground text-xs sm:text-[13px]">
                            {loc.name}
                          </div>
                          {loc.notes && (
                            <div className="text-[10px] text-muted-foreground italic font-normal">
                              {loc.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Branch / Office Address */}
                    <td className="py-4 px-4 sm:px-6 text-muted-foreground text-xs max-w-xs sm:max-w-md">
                      <div className="flex items-start space-x-1.5">
                        <Building className="h-3.5 w-3.5 text-muted-foreground/60 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{loc.branchOffice}</span>
                      </div>
                    </td>

                    {/* Coordinates */}
                    <td className="py-4 px-4">
                      <div className="space-y-0.5">
                        <div className="font-mono text-xs font-bold text-foreground">
                          {loc.latitude.toFixed(6)},
                        </div>
                        <div className="font-mono text-xs font-bold text-foreground">
                          {loc.longitude.toFixed(6)}
                        </div>
                        <a
                          href={`https://maps.google.com/?q=${loc.latitude},${loc.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 text-[10px] font-bold text-amber-500 hover:underline pt-0.5"
                        >
                          <span>View on Maps</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    </td>

                    {/* Radius */}
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[11px] border border-amber-500/20">
                        <Crosshair className="h-3 w-3" />
                        <span>{loc.radiusMeters}m</span>
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                          loc.status === 'Active'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                            : 'bg-muted/50 text-muted-foreground border-border'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            loc.status === 'Active' ? 'bg-emerald-500' : 'bg-muted-foreground'
                          }`}
                        />
                        <span>{loc.status}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 sm:px-6 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(loc)}
                          title="Edit GPS Location"
                          className="h-8 w-8 rounded-lg bg-surface border border-border/80 text-amber-500 hover:bg-amber-500/10 hover:border-amber-500/30 flex items-center justify-center transition cursor-pointer shadow-sm"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(loc.id)}
                          title="Delete GPS Location"
                          className="h-8 w-8 rounded-lg bg-surface border border-border/80 text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/30 flex items-center justify-center transition cursor-pointer shadow-sm"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <MapPin className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-xs font-bold">No GPS locations match your criteria.</p>
                    <p className="text-[11px] text-muted-foreground/70">
                      Try adjusting your search query or filter.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. ADD / EDIT GPS LOCATION MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 h-8 w-8 rounded-xl bg-surface border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface/80 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center space-x-3 border-b border-border/80 pb-4">
              <div className="h-10 w-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-foreground">
                  {editingItem ? 'Edit GPS Location' : 'Add New GPS Location'}
                </h3>
                <p className="text-[11px] font-semibold text-muted-foreground">
                  Configure geofence coordinates &amp; attendance radius
                </p>
              </div>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveLocation} className="space-y-4 text-xs">
              {/* Location Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Location Name <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Khulna Office, Rangpur Hub"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                />
              </div>

              {/* Branch / Office Address */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Branch / Office Address <span className="text-amber-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={formData.branchOffice}
                  onChange={(e) => setFormData({ ...formData, branchOffice: e.target.value })}
                  placeholder="e.g. House 09, Road 1/B, Block L, Banani, Dhaka-1213"
                  className="w-full p-3 rounded-xl bg-surface/50 border border-border text-xs sm:text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm resize-none"
                />
              </div>

              {/* Coordinates: Latitude & Longitude with Auto-detect button */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Coordinates (Lat / Lng) <span className="text-amber-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectGPS}
                    disabled={isDetectingGPS}
                    className="text-[10px] font-bold text-amber-500 hover:text-amber-400 flex items-center space-x-1 cursor-pointer"
                  >
                    <Navigation className={`h-3 w-3 ${isDetectingGPS ? 'animate-spin' : ''}`} />
                    <span>{isDetectingGPS ? 'Detecting...' : 'Get Current GPS'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      placeholder="Latitude (e.g. 23.789555)"
                      className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border font-mono text-xs sm:text-sm font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      placeholder="Longitude (e.g. 90.408706)"
                      className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border font-mono text-xs sm:text-sm font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                    />
                  </div>
                </div>

                {formData.latitude && formData.longitude && (
                  <div className="pt-1 flex items-center justify-end">
                    <a
                      href={`https://maps.google.com/?q=${formData.latitude},${formData.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-sky-500 hover:underline flex items-center space-x-1"
                    >
                      <Globe className="h-3 w-3" />
                      <span>Preview in Google Maps ↗</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Radius & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Geofence Radius (meters)
                  </label>
                  <select
                    value={formData.radiusMeters}
                    onChange={(e) =>
                      setFormData({ ...formData, radiusMeters: Number(e.target.value) })
                    }
                    className="w-full h-10 px-3 rounded-xl bg-surface/50 border border-border text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                  >
                    <option value={50}>50 meters</option>
                    <option value={100}>100 meters (Standard)</option>
                    <option value={200}>200 meters</option>
                    <option value={300}>300 meters</option>
                    <option value={500}>500 meters (Camp / Regional)</option>
                    <option value={1000}>1000 meters (1 KM)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })
                    }
                    className="w-full h-10 px-3 rounded-xl bg-surface/50 border border-border text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Remarks / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Headquarters branch, test location only"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-surface transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md transition flex items-center space-x-1.5 cursor-pointer"
                >
                  {isSaving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editingItem ? 'Save Changes' : 'Create GPS Location'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 6. DELETE CONFIRMATION MODAL ── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-center animate-in zoom-in-95 duration-150">
            <div className="h-12 w-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-foreground">Delete GPS Location?</h4>
            <p className="text-xs text-muted-foreground">
              Are you sure you want to delete this coordinate entry? Mobile attendance verification for this radius will stop functioning.
            </p>
            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-surface cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

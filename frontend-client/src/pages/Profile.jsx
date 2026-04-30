import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Mail, Phone, Calendar, Camera, CheckCircle, AlertCircle, Loader, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api/index';
import Navbar from '../components/Navbar';
import './Profile.css';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(80, 'Name too long'),
  phone: z.union([z.string().regex(/^[+]?[0-9 \-().]{7,20}$/, 'Invalid phone number'), z.literal('')]).optional(),
  dateOfBirth: z.string().optional(),
  avatar: z.union([z.string().url('Must be a valid URL'), z.literal('')]).optional(),
});

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const { register, handleSubmit, reset, watch, formState: { errors, isDirty } } = useForm({
    resolver: zodResolver(schema),
  });

  const avatarValue = watch('avatar');
  const nameValue = watch('name');

  useEffect(() => {
    authAPI.getProfile()
      .then(res => {
        const u = res.data.user;
        setProfile(u);
        reset({
          name: u.name || '',
          phone: u.phone || '',
          dateOfBirth: u.dateOfBirth ? u.dateOfBirth.split('T')[0] : '',
          avatar: u.avatar || '',
        });
      })
      .catch(() => setToast({ type: 'error', msg: 'Failed to load profile.' }))
      .finally(() => setLoading(false));
  }, [reset]);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const res = await authAPI.updateProfile({
        name: data.name,
        phone: data.phone || null,
        dateOfBirth: data.dateOfBirth || null,
        avatar: data.avatar || null,
      });
      setProfile(res.data.user);
      reset(data);
      showToast('success', 'Profile updated successfully!');
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name, email) => {
    if (name) return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    return email?.[0]?.toUpperCase() || '?';
  };

  if (loading) return (
    <div className="profile-page">
      <Navbar />
      <div className="profile-loading">
        <Loader size={32} className="profile-spinner" />
        <p>Loading profile…</p>
      </div>
    </div>
  );

  return (
    <div className="profile-page">
      <Navbar />
      <div className="profile-container">

        {toast && (
          <div className={`profile-toast ${toast.type}`}>
            {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{toast.msg}</span>
          </div>
        )}

        <div className="profile-header">
          <button className="profile-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Back
          </button>
          <h1>My Profile</h1>
          <p className="profile-sub">Manage your personal information</p>
        </div>

        <div className="profile-layout">

          {/* Left — Avatar card */}
          <div className="profile-avatar-card glass-lg">
            <div className="profile-avatar-wrap">
              {(avatarValue || profile?.avatar) ? (
                <img
                  src={avatarValue || profile?.avatar}
                  alt="Avatar"
                  className="profile-avatar-img"
                  onError={e => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="profile-avatar-placeholder">
                  {getInitials(nameValue || profile?.name, profile?.email)}
                </div>
              )}
              <div className="profile-avatar-overlay">
                <Camera size={18} />
              </div>
            </div>
            <div className="profile-avatar-info">
              <h3>{profile?.name || 'No name set'}</h3>
              <p>{profile?.email}</p>
              <span className={`profile-role-badge role-${profile?.role}`}>{profile?.role}</span>
            </div>
            {profile?.googleId && (
              <div className="profile-google-badge">
                <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Linked with Google
              </div>
            )}
            <div className="profile-member-since">
              Member since {new Date(profile?.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </div>
          </div>

          {/* Right — Edit form */}
          <div className="profile-form-card glass-lg">
            <h2>Edit Information</h2>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>

              <div className="profile-form-grid">
                <div className="form-group">
                  <label className="form-label">
                    <User size={14} /> Full Name
                  </label>
                  <input
                    type="text"
                    className={`form-input ${errors.name ? 'input-error' : ''}`}
                    placeholder="Your full name"
                    {...register('name')}
                  />
                  {errors.name && <p className="field-error">{errors.name.message}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Mail size={14} /> Email Address
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    value={profile?.email || ''}
                    disabled
                    style={{ opacity: 0.6, cursor: 'not-allowed' }}
                  />
                  <p className="profile-field-note">Email cannot be changed</p>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Phone size={14} /> Phone Number
                  </label>
                  <input
                    type="tel"
                    className={`form-input ${errors.phone ? 'input-error' : ''}`}
                    placeholder="+91 98765 43210"
                    {...register('phone')}
                  />
                  {errors.phone && <p className="field-error">{errors.phone.message}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Calendar size={14} /> Date of Birth
                  </label>
                  <input
                    type="date"
                    className={`form-input ${errors.dateOfBirth ? 'input-error' : ''}`}
                    max={new Date().toISOString().split('T')[0]}
                    {...register('dateOfBirth')}
                  />
                  {errors.dateOfBirth && <p className="field-error">{errors.dateOfBirth.message}</p>}
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 4 }}>
                <label className="form-label">
                  <Camera size={14} /> Avatar URL
                </label>
                <input
                  type="url"
                  className={`form-input ${errors.avatar ? 'input-error' : ''}`}
                  placeholder="https://example.com/your-photo.jpg"
                  {...register('avatar')}
                />
                {errors.avatar && <p className="field-error">{errors.avatar.message}</p>}
              </div>

              <div className="profile-form-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => reset({ name: profile?.name || '', phone: profile?.phone || '', dateOfBirth: profile?.dateOfBirth?.split('T')[0] || '', avatar: profile?.avatar || '' })}
                  disabled={!isDirty || saving}
                >
                  Discard Changes
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!isDirty || saving}
                >
                  {saving ? <><Loader size={15} className="es-spinner" /> Saving…</> : 'Save Changes'}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

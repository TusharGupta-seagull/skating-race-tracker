import { useState, useEffect } from 'react';
import { useForm, useFieldArray, type FieldErrors } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { raceFormSchema, zod4Resolver, type RaceFormSchema } from '@/lib/validation';
import { parseTimeToMs } from '@/lib/time';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { nanoid } from '@/lib/nanoid';
import type { Race, RaceCategory } from '@/types';

interface RaceFormProps {
  defaultValues?: Partial<RaceFormSchema>;
  categories: RaceCategory[];
  onSave: (data: Omit<Race, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onSaveAndAdd?: (data: Omit<Race, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  isEdit?: boolean;
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function buildDefaultValues(override?: Partial<RaceFormSchema>): RaceFormSchema {
  const today = todayISO();
  return {
    eventName: '',
    eventDate: today,
    eventYear: new Date().getFullYear(),
    categoryId: '',
    skaterTime: '',
    skaterRank: 1,
    topPerformers: [],
    notes: '',
    ...override,
  };
}

export default function RaceForm({
  defaultValues,
  categories,
  onSave,
  onSaveAndAdd,
  onCancel,
  submitLabel = 'Save Race',
  isEdit = false,
}: RaceFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<RaceFormSchema>({
    resolver: zod4Resolver(raceFormSchema),
    defaultValues: buildDefaultValues(defaultValues),
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'topPerformers' });
  const activeCategories = categories.filter((c) => !c.isArchived);

  // Auto-select first active category if none chosen yet
  useEffect(() => {
    if (!isEdit && !defaultValues?.categoryId && activeCategories.length > 0) {
      const currentCat = getValues('categoryId');
      if (!currentCat) {
        setValue('categoryId', activeCategories[0].id, { shouldValidate: true });
      }
    }
  }, [activeCategories, defaultValues, isEdit, setValue, getValues]);

  // Derive year from date automatically
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = e.target.value;
    if (d) setValue('eventYear', new Date(d + 'T00:00:00').getFullYear());
  };

  const buildRaceData = (data: RaceFormSchema): Omit<Race, 'id' | 'createdAt' | 'updatedAt'> => ({
    eventName: data.eventName.trim(),
    eventDate: data.eventDate,
    eventYear: data.eventYear,
    categoryId: data.categoryId,
    skaterTimeMs: parseTimeToMs(data.skaterTime)!,
    skaterRank: Number(data.skaterRank),
    topPerformers: data.topPerformers
      .filter((p) => (p.name && p.name.trim()) || (p.time && p.time.trim()))
      .map((p) => ({
        id: p.id || nanoid(),
        name: (p.name || '').trim(),
        timeMs: p.time ? (parseTimeToMs(p.time) ?? 0) : 0,
        rank: Number(p.rank),
      })),
    notes: data.notes || '',
  });

  const onInvalid = (formErrors: FieldErrors<RaceFormSchema>) => {
    const messages: string[] = [];
    if (formErrors.eventName) messages.push(formErrors.eventName.message || 'Event Name required');
    if (formErrors.eventDate) messages.push(formErrors.eventDate.message || 'Date required');
    if (formErrors.categoryId) messages.push(formErrors.categoryId.message || 'Category required');
    if (formErrors.skaterTime) messages.push(formErrors.skaterTime.message || 'Valid time required');
    if (formErrors.skaterRank) messages.push(formErrors.skaterRank.message || 'Rank required');
    if (formErrors.topPerformers) messages.push('Top performers need name when time is provided');

    setSubmitError(messages.join(' · ') || 'Please verify highlighted fields.');
  };

  const handleSave = handleSubmit(async (data) => {
    setSubmitError(null);
    try {
      await onSave(buildRaceData(data));
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save race.');
    }
  }, onInvalid);

  const handleSaveAndAdd = onSaveAndAdd
    ? handleSubmit(async (data) => {
        setSubmitError(null);
        try {
          await onSaveAndAdd(buildRaceData(data));
          reset(buildDefaultValues({ categoryId: activeCategories[0]?.id || '' }));
        } catch (err) {
          setSubmitError(err instanceof Error ? err.message : 'Failed to save race.');
        }
      }, onInvalid)
    : undefined;

  const handleCancel = () => {
    if (isDirty) {
      if (!window.confirm('You have unsaved changes. Discard them?')) return;
    }
    onCancel();
  };

  return (
    <form
      onSubmit={handleSave}
      noValidate
      style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '640px' }}
    >
      {/* ─── 1. Event Details ───────────────────────────────────────────── */}
      <div className="ent-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-secondary)',
          }}
        >
          EVENT DETAILS
        </span>

        {/* Event Name */}
        <div>
          <label
            htmlFor="eventName"
            style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}
          >
            EVENT NAME <span style={{ color: 'var(--perf-negative)' }}>*</span>
          </label>
          <input
            id="eventName"
            className="ent-input"
            placeholder="e.g. National Speed Championship 2026"
            {...register('eventName')}
          />
          {errors.eventName && (
            <span style={{ fontSize: '10.5px', color: 'var(--perf-negative)', marginTop: '2px', display: 'block' }}>
              {errors.eventName.message}
            </span>
          )}
        </div>

        {/* Date and Year */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '10px' }}>
          <div>
            <label
              htmlFor="eventDate"
              style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}
            >
              EVENT DATE <span style={{ color: 'var(--perf-negative)' }}>*</span>
            </label>
            <input
              id="eventDate"
              type="date"
              className="ent-input"
              {...register('eventDate', { onChange: handleDateChange })}
            />
            {errors.eventDate && (
              <span style={{ fontSize: '10.5px', color: 'var(--perf-negative)', marginTop: '2px', display: 'block' }}>
                {errors.eventDate.message}
              </span>
            )}
          </div>

          <div>
            <label
              htmlFor="eventYear"
              style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}
            >
              YEAR
            </label>
            <input
              id="eventYear"
              type="number"
              className="ent-input"
              {...register('eventYear')}
            />
            {errors.eventYear && (
              <span style={{ fontSize: '10.5px', color: 'var(--perf-negative)', marginTop: '2px', display: 'block' }}>
                {errors.eventYear.message}
              </span>
            )}
          </div>
        </div>

        {/* Category */}
        <div>
          <label
            htmlFor="categoryId"
            style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}
          >
            RACE CATEGORY <span style={{ color: 'var(--perf-negative)' }}>*</span>
          </label>
          {activeCategories.length === 0 ? (
            <div style={{ fontSize: '11px', color: 'var(--perf-negative)', padding: '6px 0' }}>
              No active categories found.{' '}
              <Link to="/categories" style={{ textDecoration: 'underline', fontWeight: 600 }}>
                Create or restore a category
              </Link>{' '}
              first.
            </div>
          ) : (
            <select
              id="categoryId"
              className="ent-input"
              style={{ appearance: 'auto', cursor: 'pointer' }}
              {...register('categoryId')}
            >
              <option value="">Select a category...</option>
              {activeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          {errors.categoryId && (
            <span style={{ fontSize: '10.5px', color: 'var(--perf-negative)', marginTop: '2px', display: 'block' }}>
              {errors.categoryId.message}
            </span>
          )}
        </div>
      </div>

      {/* ─── 2. Skater Result ───────────────────────────────────────────── */}
      <div className="ent-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-secondary)',
          }}
        >
          SKATER RESULT
        </span>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '10px' }}>
          <div>
            <label
              htmlFor="skaterTime"
              style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}
            >
              COMPLETION TIME (mm:ss.cs) <span style={{ color: 'var(--perf-negative)' }}>*</span>
            </label>
            <input
              id="skaterTime"
              className="ent-input mono"
              placeholder="e.g. 00:43.12 or 01:28.50"
              {...register('skaterTime')}
            />
            {errors.skaterTime ? (
              <span style={{ fontSize: '10.5px', color: 'var(--perf-negative)', marginTop: '2px', display: 'block' }}>
                {errors.skaterTime.message}
              </span>
            ) : (
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                Minutes:seconds.centiseconds (e.g. 00:43.12 or 43.12)
              </span>
            )}
          </div>

          <div>
            <label
              htmlFor="skaterRank"
              style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}
            >
              YOUR RANK <span style={{ color: 'var(--perf-negative)' }}>*</span>
            </label>
            <input
              id="skaterRank"
              type="number"
              min={1}
              className="ent-input"
              {...register('skaterRank')}
            />
            {errors.skaterRank && (
              <span style={{ fontSize: '10.5px', color: 'var(--perf-negative)', marginTop: '2px', display: 'block' }}>
                {errors.skaterRank.message}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── 3. Top Performers (Optional, max 3) ────────────────────────── */}
      <div className="ent-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-secondary)',
            }}
          >
            TOP PERFORMERS (UP TO 3)
          </span>

          {fields.length < 3 && (
            <button
              type="button"
              className="ent-btn ent-btn-secondary"
              style={{ height: '24px', fontSize: '10.5px' }}
              onClick={() =>
                append({
                  id: nanoid(),
                  name: '',
                  time: '',
                  rank: fields.length + 1,
                })
              }
            >
              <Plus size={11} /> Add Performer
            </button>
          )}
        </div>

        {fields.length === 0 && (
          <p style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
            No top performers added. You can record 1st, 2nd, and 3rd place skater times for comparison.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {fields.map((field, idx) => {
            const rankTitle = ['1st Place', '2nd Place', '3rd Place'][idx] ?? `Place #${idx + 1}`;

            return (
              <div
                key={field.id}
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'var(--surface-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {rankTitle}
                  </span>
                  <button
                    type="button"
                    className="ent-btn ent-btn-ghost"
                    style={{ height: '22px', padding: '0 4px', color: 'var(--perf-negative)' }}
                    onClick={() => remove(idx)}
                    title="Remove performer"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '8px' }}>
                  <div>
                    <input
                      className="ent-input"
                      placeholder="Skater Name"
                      {...register(`topPerformers.${idx}.name`)}
                    />
                    {errors.topPerformers?.[idx]?.name && (
                      <span style={{ fontSize: '10px', color: 'var(--perf-negative)', marginTop: '2px', display: 'block' }}>
                        {errors.topPerformers[idx]?.name?.message}
                      </span>
                    )}
                  </div>
                  <div>
                    <input
                      className="ent-input mono"
                      placeholder="Time (mm:ss.cs)"
                      {...register(`topPerformers.${idx}.time`)}
                    />
                    {errors.topPerformers?.[idx]?.time && (
                      <span style={{ fontSize: '10px', color: 'var(--perf-negative)', marginTop: '2px', display: 'block' }}>
                        {errors.topPerformers[idx]?.time?.message}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── 4. Notes ───────────────────────────────────────────────────── */}
      <div className="ent-card" style={{ padding: '14px 16px' }}>
        <label
          htmlFor="notes"
          style={{
            fontSize: '10px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-secondary)',
            display: 'block',
            marginBottom: '6px',
          }}
        >
          RACE NOTES (CONDITIONS, TACTICS, FEELINGS)
        </label>
        <textarea
          id="notes"
          className="ent-input"
          placeholder="e.g. Ice was fast, sharp crossovers on backstretch..."
          rows={3}
          style={{ height: 'auto', minHeight: '64px', padding: '8px 10px', resize: 'vertical' }}
          {...register('notes')}
        />
      </div>

      {/* ─── Submit Error Banner ────────────────────────────────────────── */}
      {submitError && (
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: 'var(--perf-negative-bg)',
            border: '1px solid var(--perf-negative-border)',
            borderRadius: '6px',
            fontSize: '11.5px',
            color: 'var(--perf-negative)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
          role="alert"
        >
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          <span>{submitError}</span>
        </div>
      )}

      {/* ─── Form Actions ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingTop: '4px' }}>
        <button
          type="submit"
          className="ent-btn ent-btn-primary"
          style={{ height: '30px', padding: '0 14px' }}
          disabled={isSubmitting}
        >
          {submitLabel}
        </button>

        {!isEdit && handleSaveAndAdd && (
          <button
            type="button"
            className="ent-btn ent-btn-secondary"
            style={{ height: '30px', padding: '0 12px' }}
            onClick={handleSaveAndAdd}
            disabled={isSubmitting}
          >
            Save & Add Another
          </button>
        )}

        <button
          type="button"
          className="ent-btn ent-btn-ghost"
          style={{ height: '30px', padding: '0 12px' }}
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

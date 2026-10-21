import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, raceRepo } from '@/db';
import RaceForm from './RaceForm';
import { Toast, Spinner } from '@/components/ui';
import { formatMs } from '@/lib/time';
import type { Race } from '@/types';
import type { RaceFormSchema } from '@/lib/validation';

export default function EditRace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];
  const [race, setRace] = useState<Race | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!id) return;
    raceRepo.getById(id).then((r) => {
      setRace(r ?? null);
      setLoading(false);
    });
  }, [id]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
        <Spinner size={24} />
      </div>
    );
  }

  if (!race) {
    return (
      <div className="ent-card" style={{ padding: '24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--perf-negative)', fontSize: '13px' }}>Race not found.</p>
      </div>
    );
  }

  const defaultValues: Partial<RaceFormSchema> = {
    eventName: race.eventName,
    eventDate: race.eventDate,
    eventYear: race.eventYear,
    categoryId: race.categoryId,
    skaterTime: formatMs(race.skaterTimeMs),
    skaterRank: race.skaterRank,
    topPerformers: race.topPerformers.map((p) => ({
      id: p.id,
      name: p.name,
      time: formatMs(p.timeMs),
      rank: p.rank,
    })),
    notes: race.notes ?? '',
  };

  const handleSave = async (data: Omit<Race, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await raceRepo.update(race.id, data);
      showToast('Race updated!');
      navigate(`/race/${race.id}`);
    } catch (e) {
      showToast('Failed to update race.', 'error');
      throw e;
    }
  };

  return (
    <div style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Edit Race
        </h1>
        <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          {race.eventName} · {race.eventDate}
        </p>
      </div>

      <RaceForm
        categories={categories}
        defaultValues={defaultValues}
        onSave={handleSave}
        onCancel={() => navigate(`/race/${race.id}`)}
        submitLabel="Save Changes"
        isEdit
      />

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  );
}

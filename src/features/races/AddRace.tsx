import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, raceRepo } from '@/db';
import RaceForm from './RaceForm';
import { Toast } from '@/components/ui';
import type { Race } from '@/types';

export default function AddRace() {
  const navigate = useNavigate();
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async (data: Omit<Race, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const race = await raceRepo.create(data);
      showToast('Race saved!');
      navigate(`/race/${race.id}`);
    } catch (e) {
      showToast('Failed to save race. Please try again.', 'error');
      throw e;
    }
  };

  const handleSaveAndAdd = async (data: Omit<Race, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await raceRepo.create(data);
      showToast('Race saved! Add another.');
    } catch (e) {
      showToast('Failed to save race. Please try again.', 'error');
      throw e;
    }
  };

  return (
    <div style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Add Race
        </h1>
        <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Log an official speed skating race result, your personal performance, and top 3 competitors.
        </p>
      </div>

      <RaceForm
        categories={categories}
        onSave={handleSave}
        onSaveAndAdd={handleSaveAndAdd}
        onCancel={() => navigate(-1)}
      />

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  );
}

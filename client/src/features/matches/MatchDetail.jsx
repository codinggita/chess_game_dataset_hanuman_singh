import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { matchService } from '../../services/match.service.js';
import { useAuth } from '../../hooks/useAuth.js';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import { ErrorState } from '../../components/ui/EmptyState.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { formatDateTime, getResultBadgeClass } from '../../utils/formatters.js';
import MatchReplay from '../replay/MatchReplay.jsx';

  // Logic moved to MatchReplay component

const MatchDetail = () => {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    matchService.getById(id)
      .then((res) => setMatch(res.data?.data?.match ?? res.data?.match ?? res.data?.data ?? res.data))
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [id]);

  const handleDelete = async () => {
    try {
      await matchService.remove(id);
      toast.success('MATCH DELETED');
      navigate('/matches');
    } catch {
      toast.error('DELETE FAILED');
    }
  };

  if (loading) return (
    <div>
      <Skeleton height={40} width="40%" className="mb-4" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <Skeleton height={120} />
        <Skeleton height={120} />
      </div>
    </div>
  );

  if (error) return <ErrorState title="MATCH NOT FOUND" message={error} />;
  if (!match) return null;

  const fields = [
    ['Match ID', match._id],
    ['White Player', match.white_id],
    ['White Rating', match.white_rating],
    ['Black Player', match.black_id],
    ['Black Rating', match.black_rating],
    ['Winner', match.winner?.toUpperCase()],
    ['Turns', match.turns],
    ['Opening ECO', match.opening_eco],
    ['Opening Name', match.opening_name || match.opening],
    ['Time Increment', match.time_increment],
    ['Rated', match.rated ? 'YES' : 'NO'],
    ['Created At', formatDateTime(match.createdAt)],
  ];

  return (
    <>
      <Helmet>
        <title>Match Detail | Chess Match Analytics</title>
      </Helmet>

      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Link to="/matches" className="btn btn-ghost btn-sm"><ArrowLeft size={14} /> BACK</Link>
          <h1>Match Detail</h1>
          <Badge variant={getResultBadgeClass(match.winner).replace('badge-', '')}>
            {match.winner?.toUpperCase() || '—'}
          </Badge>
        </div>
        {isAdmin && (
          <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 size={14} /> DELETE
          </Button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
        <MatchReplay match={match} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
            {fields.map(([label, value]) => value != null && (
            <div key={label} style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '12px 16px',
              border: 'var(--border-thin)',
              background: 'var(--color-bg-alt)',
            }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-muted)' }}>
                {label}
              </span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                {value || '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Modal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="DELETE THIS MATCH?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>CANCEL</Button>
            <Button variant="danger" onClick={handleDelete}>CONFIRM DELETE</Button>
          </>
        }
      >
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)' }}>
          This action is permanent and cannot be undone.
        </p>
      </Modal>
    </>
  );
};

export default MatchDetail;

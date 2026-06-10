import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { searchService } from '../../services/search.service.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import Button from '../../components/ui/Button.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import Badge from '../../components/ui/Badge.jsx';

const TABS = ['ALL', 'MATCHES', 'PLAYERS', 'OPENINGS'];

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('ALL');
  const [results, setResults] = useState({ matches: [], players: [], openings: [] });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const q = useDebounce(query, 600); // Increased debounce to 600ms to avoid 429 errors

  const doSearch = useCallback(async (sq) => {
    // Only search if 2+ characters to prevent spamming the API
    if (!sq.trim() || sq.trim().length < 2) { 
      setResults({ matches: [], players: [], openings: [] }); 
      setSearched(false); 
      return; 
    }
    setLoading(true);
    setSearched(true);
    try {
      const toFetch = [];
      if (tab === 'ALL' || tab === 'MATCHES') toFetch.push(searchService.searchMatches(sq).then((r) => ({ key: 'matches', data: r.data?.data?.matches ?? r.data?.matches ?? r.data?.data ?? [] })));
      if (tab === 'ALL' || tab === 'PLAYERS') toFetch.push(searchService.searchPlayers(sq).then((r) => ({ key: 'players', data: r.data?.data?.players ?? r.data?.players ?? r.data?.data ?? [] })));
      if (tab === 'ALL' || tab === 'OPENINGS') toFetch.push(searchService.searchOpenings(sq).then((r) => ({ key: 'openings', data: r.data?.data?.openings ?? r.data?.openings ?? r.data?.data ?? [] })));

      const settled = await Promise.allSettled(toFetch);
      const newResults = { matches: [], players: [], openings: [] };
      settled.forEach((s) => { 
        if (s.status === 'fulfilled') {
          newResults[s.value.key] = Array.isArray(s.value.data) ? s.value.data : [];
        }
      });
      setResults(newResults);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { doSearch(q); }, [q, doSearch]);

  useEffect(() => {
    const last = sessionStorage.getItem('chess_last_search');
    if (last) setQuery(last);
  }, []);

  const handleSearch = (e) => {
    const val = e.target.value;
    setQuery(val);
    sessionStorage.setItem('chess_last_search', val);
  };

  const totalResults = results.matches.length + results.players.length + results.openings.length;

  const ResultCard = ({ children, href, id }) => (
    <Link to={href} id={id} style={{ textDecoration: 'none' }}>
      <div style={{
        padding: 'var(--space-3) var(--space-4)',
        border: 'var(--border-thick)',
        marginBottom: 8,
        background: 'var(--color-bg-alt)',
        boxShadow: 'var(--shadow-sm)',
        transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
        cursor: 'pointer',
      }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translate(4px,4px)'; e.currentTarget.style.boxShadow = 'none'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
      >
        {children}
      </div>
    </Link>
  );

  return (
    <>
      <Helmet>
        <title>Search | Chess Match Analytics</title>
        <meta name="description" content="Search chess matches, players, and openings" />
      </Helmet>

      <div className="page-header">
        <h1>Search</h1>
      </div>

      {/* Search input */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <input
          className="brutal-input"
          placeholder="SEARCH MATCHES, PLAYERS, OPENINGS…"
          value={query}
          onChange={handleSearch}
          id="global-search-input"
          style={{ flex: 1, fontSize: 'var(--font-size-lg)' }}
          autoFocus
        />
        <Button id="search-btn" onClick={() => doSearch(q)}>SEARCH</Button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 'var(--space-4)', border: 'var(--border-thick)' }}>
        {TABS.map((t) => (
          <button
            key={t}
            id={`search-tab-${t.toLowerCase()}`}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: '10px',
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--font-size-xs)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              border: 'none',
              borderRight: t !== 'OPENINGS' ? 'var(--border-thick)' : 'none',
              cursor: 'pointer',
              background: tab === t ? 'var(--color-green)' : 'var(--color-bg-alt)',
              color: tab === t ? 'var(--color-white)' : 'var(--color-ink)',
              transition: 'background var(--transition-fast)',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array(5).fill(0).map((_, i) => <Skeleton key={i} height={60} />)}
        </div>
      )}

      {/* Results */}
      {!loading && searched && (
        <>
          {totalResults === 0 ? (
            <EmptyState
              title={`NO RESULTS FOUND FOR "${query.toUpperCase()}"`}
              message="Try a different search term"
              icon="🔍"
            />
          ) : (
            <>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-xs)',
                textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-muted)',
                marginBottom: 'var(--space-4)',
              }}>
                {totalResults} Results for "{query}"
              </div>

              {/* Matches */}
              {(tab === 'ALL' || tab === 'MATCHES') && results.matches.length > 0 && (
                <div style={{ marginBottom: 'var(--space-5)' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-md)', letterSpacing: '0.08em', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    MATCHES <Badge variant="outline">{results.matches.length}</Badge>
                  </h2>
                  {results.matches.map((m, i) => (
                    <ResultCard key={m._id || i} href={`/matches/${m._id}`} id={`search-match-${m._id}`}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 600 }}>
                          {m.white_id || '—'} vs {m.black_id || '—'}
                        </span>
                        <Badge variant={m.winner === 'white' ? 'outline' : m.winner === 'black' ? 'black' : 'warning'}>
                          {m.winner?.toUpperCase() || '—'}
                        </Badge>
                      </div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted)', marginTop: 4, fontFamily: 'var(--font-ui)' }}>
                        {m.opening_name || m.opening || ''} · {m.turns} turns
                      </div>
                    </ResultCard>
                  ))}
                </div>
              )}

              {/* Players */}
              {(tab === 'ALL' || tab === 'PLAYERS') && results.players.length > 0 && (
                <div style={{ marginBottom: 'var(--space-5)' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-md)', letterSpacing: '0.08em', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    PLAYERS <Badge variant="outline">{results.players.length}</Badge>
                  </h2>
                  {results.players.map((p, i) => (
                    <ResultCard key={p._id || i} href={`/players/${p._id}`} id={`search-player-${p._id}`}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase' }}>
                          ♟ {p.username || p.name || p._id}
                        </span>
                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--font-size-xs)', color: 'var(--color-muted)' }}>
                          {p.totalGames || 0} games
                        </span>
                      </div>
                    </ResultCard>
                  ))}
                </div>
              )}

              {/* Openings */}
              {(tab === 'ALL' || tab === 'OPENINGS') && results.openings.length > 0 && (
                <div style={{ marginBottom: 'var(--space-5)' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-md)', letterSpacing: '0.08em', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    OPENINGS <Badge variant="outline">{results.openings.length}</Badge>
                  </h2>
                  {results.openings.map((o, i) => (
                    <ResultCard key={o._id || i} href={`/openings`} id={`search-opening-${o._id}`}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Badge variant="green">{o.eco || o.ECO || '—'}</Badge>
                        <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 600 }}>{o.name || o.opening}</span>
                        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-ui)', fontSize: 'var(--font-size-xs)', color: 'var(--color-muted)' }}>
                          {o.totalGames?.toLocaleString() || 0} games
                        </span>
                      </div>
                    </ResultCard>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Idle state */}
      {!loading && !searched && (
        <EmptyState
          title="START SEARCHING"
          message="Type to search across matches, players, and openings"
          icon="🔍"
        />
      )}
    </>
  );
};

export default SearchPage;

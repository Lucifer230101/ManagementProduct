'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  TablePagination,
  CircularProgress,
  Alert,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
} from '@mui/icons-material';

import { auditService } from '@/services/api/auditService';
import { AuditLogItem } from '@/types';

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(15);
  const [actionSearch, setActionSearch] = useState('');
  const [entitySearch, setEntitySearch] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await auditService.getAuditLogs({
        page: page + 1,
        limit,
        action: actionSearch.trim(),
        entity: entitySearch.trim(),
      });
      setLogs(res.data || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to retrieve audit logs' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [page, limit]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    loadLogs();
  };

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a' }}>
          Security & Audit Trails
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Append-only tamper-evident record of all identity, role, employee, and shop configuration modifications.
        </Typography>
      </Box>

      {feedback && (
        <Alert severity={feedback.type} sx={{ mb: 3 }} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      )}

      {/* Filters */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Filter by action (e.g. user.create)…"
            value={actionSearch}
            onChange={(e) => setActionSearch(e.target.value)}
            sx={{ flex: 1, minWidth: 200 }}
          />
          <TextField
            size="small"
            placeholder="Filter by entity (e.g. shop, user)…"
            value={entitySearch}
            onChange={(e) => setEntitySearch(e.target.value)}
            sx={{ flex: 1, minWidth: 200 }}
          />
          <Button type="submit" variant="outlined" startIcon={<SearchIcon />}>
            Filter
          </Button>
          <IconButton onClick={loadLogs} title="Refresh" size="small">
            <RefreshIcon />
          </IconButton>
        </form>
      </Paper>

      {/* Audit Logs Table */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden', bgcolor: '#ffffff' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Timestamp</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Action</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Entity</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Actor / User</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6, color: '#64748b' }}>
                    No audit records found.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell sx={{ fontSize: '0.85rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.action}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          bgcolor: '#f1f5f9',
                          color: '#0f172a',
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                        {log.entity}
                      </Typography>
                      {log.entityId && (
                        <Typography variant="caption" sx={{ color: '#94a3b8', fontFamily: 'monospace' }}>
                          ID: {log.entityId.slice(0, 8)}…
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#0f172a' }}>
                        {log.userName || 'System / Owner'}
                      </Typography>
                      {log.userEmail && (
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          {log.userEmail}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Inspect Change Diff">
                        <IconButton size="small" onClick={() => setSelectedLog(log)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={limit}
          onRowsPerPageChange={(e) => {
            setLimit(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 15, 25, 50]}
        />
      </Paper>

      {/* Inspect Log Diff Modal */}
      <Dialog open={!!selectedLog} onClose={() => setSelectedLog(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon /> Audit Event: {selectedLog?.action}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 2, fontSize: '0.85rem' }}>
            <Box>
              <strong>Entity:</strong> {selectedLog?.entity}
            </Box>
            <Box>
              <strong>Target ID:</strong> <code>{selectedLog?.entityId || 'N/A'}</code>
            </Box>
            <Box>
              <strong>Actor:</strong> {selectedLog?.userName} ({selectedLog?.userEmail || 'N/A'})
            </Box>
            <Box>
              <strong>Timestamp:</strong> {selectedLog?.createdAt ? new Date(selectedLog.createdAt).toLocaleString() : ''}
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Previous State (Old Value)
              </Typography>
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  mt: 0.5,
                  bgcolor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 2,
                  maxHeight: 280,
                  overflowY: 'auto',
                }}
              >
                <pre style={{ margin: 0, fontSize: '0.75rem', fontFamily: 'monospace' }}>
                  {selectedLog?.oldValue ? JSON.stringify(selectedLog.oldValue, null, 2) : 'None (Created / Initial)'}
                </pre>
              </Paper>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Modified State (New Value)
              </Typography>
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  mt: 0.5,
                  bgcolor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 2,
                  maxHeight: 280,
                  overflowY: 'auto',
                }}
              >
                <pre style={{ margin: 0, fontSize: '0.75rem', fontFamily: 'monospace' }}>
                  {selectedLog?.newValue ? JSON.stringify(selectedLog.newValue, null, 2) : 'None (Deleted)'}
                </pre>
              </Paper>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelectedLog(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

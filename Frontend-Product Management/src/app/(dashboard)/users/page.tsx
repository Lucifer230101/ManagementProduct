'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
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
  MenuItem,
  Alert,
  CircularProgress,
  TablePagination,
  Tooltip,
  Switch,
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Shield as ShieldIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

import { userService, CreateUserPayload } from '@/services/api/userService';
import { roleService } from '@/services/api/roleService';
import { UserItem, RoleItem } from '@/types';

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Create User Dialog State
  const [openCreate, setOpenCreate] = useState(false);
  const [createData, setCreateData] = useState<CreateUserPayload>({
    name: '',
    email: '',
    phone: '',
    password: '',
    roleId: '',
  });
  const [creating, setCreating] = useState(false);

  // Edit User Dialog State
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRoleId, setEditRoleId] = useState('');
  const [updating, setUpdating] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes] = await Promise.all([
        userService.getUsers({ page: page + 1, limit, search }),
        roleService.getRoles(),
      ]);
      setUsers(usersRes.data || []);
      setTotal(usersRes.total || 0);
      setRoles(rolesRes.data || []);
      if (!createData.roleId && rolesRes.data?.length) {
        setCreateData((prev) => ({ ...prev, roleId: rolesRes.data[0].id }));
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, limit]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    loadData();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFeedback(null);
    try {
      await userService.createUser(createData);
      setFeedback({ type: 'success', message: 'User created successfully!' });
      setOpenCreate(false);
      setCreateData({ name: '', email: '', phone: '', password: '', roleId: roles[0]?.id || '' });
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create user' });
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (user: UserItem) => {
    try {
      await userService.updateUserStatus(user.id, !user.isActive);
      setFeedback({
        type: 'success',
        message: `User ${user.name} ${!user.isActive ? 'activated' : 'deactivated'} successfully`,
      });
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to change user status' });
    }
  };

  const handleOpenEdit = (user: UserItem) => {
    setEditUser(user);
    setEditName(user.name);
    setEditPhone(user.phone || '');
    setEditRoleId(user.roleId);
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setUpdating(true);
    setFeedback(null);
    try {
      await userService.updateUser(editUser.id, {
        name: editName.trim(),
        phone: editPhone.trim() || null,
      });

      if (editRoleId && editRoleId !== editUser.roleId) {
        await userService.updateUserRole(editUser.id, editRoleId);
      }

      setFeedback({ type: 'success', message: 'User updated successfully!' });
      setEditUser(null);
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update user' });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a' }}>
            User Accounts & Access
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage staff login accounts, passwords, and assigned permissions.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => setOpenCreate(true)}
          sx={{
            bgcolor: '#0f172a',
            color: '#ffffff',
            fontWeight: 600,
            '&:hover': { bgcolor: '#1e293b' },
          }}
        >
          Add User
        </Button>
      </Box>

      {feedback && (
        <Alert severity={feedback.type} sx={{ mb: 3 }} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      )}

      {/* Search Bar & Filters */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1, maxWidth: 400 }}
          />
          <Button type="submit" variant="outlined" startIcon={<SearchIcon />} size="medium">
            Search
          </Button>
          <IconButton onClick={loadData} title="Refresh" size="small">
            <RefreshIcon />
          </IconButton>
        </form>
      </Paper>

      {/* Users Table */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden', bgcolor: '#ffffff' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Email & Phone</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Created At</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: '#64748b' }}>
                    No users found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell sx={{ fontWeight: 600, color: '#0f172a' }}>
                      {user.name}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#0f172a' }}>{user.email}</Typography>
                      {user.phone && (
                        <Typography variant="caption" sx={{ color: '#64748b' }}>{user.phone}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={<ShieldIcon fontSize="small" />}
                        label={user.role}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          bgcolor: user.role === 'Owner' ? '#fef3c7' : '#f1f5f9',
                          color: user.role === 'Owner' ? '#92400e' : '#334155',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.isActive ? 'Active' : 'Disabled'}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          bgcolor: user.isActive ? '#dcfce7' : '#fee2e2',
                          color: user.isActive ? '#166534' : '#991b1b',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.85rem', color: '#64748b' }}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit Profile & Role">
                        <IconButton size="small" onClick={() => handleOpenEdit(user)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={user.isActive ? 'Deactivate Account' : 'Activate Account'}>
                        <Switch
                          size="small"
                          checked={user.isActive}
                          onChange={() => handleToggleStatus(user)}
                          color="primary"
                        />
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
          rowsPerPageOptions={[5, 10, 25]}
        />
      </Paper>

      {/* Create User Dialog */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add New User Account</DialogTitle>
        <form onSubmit={handleCreateUser}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Full Name"
              required
              fullWidth
              size="small"
              value={createData.name}
              onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
            />
            <TextField
              label="Email Address"
              type="email"
              required
              fullWidth
              size="small"
              value={createData.email}
              onChange={(e) => setCreateData({ ...createData, email: e.target.value })}
            />
            <TextField
              label="Phone Number"
              fullWidth
              size="small"
              placeholder="+91 9876543210 (Optional)"
              value={createData.phone}
              onChange={(e) => setCreateData({ ...createData, phone: e.target.value })}
            />
            <TextField
              label="Password"
              type="password"
              required
              fullWidth
              size="small"
              helperText="Minimum 8 characters"
              value={createData.password}
              onChange={(e) => setCreateData({ ...createData, password: e.target.value })}
            />
            <TextField
              select
              label="Assign Role"
              required
              fullWidth
              size="small"
              value={createData.roleId}
              onChange={(e) => setCreateData({ ...createData, roleId: e.target.value })}
            >
              {roles.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.name} {r.isSystem ? '(System)' : ''}
                </MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setOpenCreate(false)} disabled={creating}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={creating}
              sx={{ bgcolor: '#0f172a', color: '#fff', '&:hover': { bgcolor: '#1e293b' } }}
            >
              {creating ? 'Creating…' : 'Create User'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onClose={() => setEditUser(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit User: {editUser?.name}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Full Name"
            required
            fullWidth
            size="small"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <TextField
            label="Phone Number"
            fullWidth
            size="small"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
          />
          <TextField
            select
            label="Change Role"
            required
            fullWidth
            size="small"
            value={editRoleId}
            onChange={(e) => setEditRoleId(e.target.value)}
          >
            {roles.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                {r.name} {r.isSystem ? '(System)' : ''}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setEditUser(null)} disabled={updating}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveEdit}
            variant="contained"
            disabled={updating}
            sx={{ bgcolor: '#0f172a', color: '#fff', '&:hover': { bgcolor: '#1e293b' } }}
          >
            {updating ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

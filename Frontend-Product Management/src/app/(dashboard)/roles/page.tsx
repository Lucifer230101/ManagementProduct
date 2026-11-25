'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Security as SecurityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Lock as LockIcon,
} from '@mui/icons-material';

import { roleService } from '@/services/api/roleService';
import { RoleItem, PermissionItem } from '@/types';

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Create Role State
  const [openCreate, setOpenCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createPerms, setCreatePerms] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // Edit Permissions Dialog State
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [savingPerms, setSavingPerms] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesRes, permsRes] = await Promise.all([
        roleService.getRoles(),
        roleService.getPermissions(),
      ]);
      setRoles(rolesRes.data || []);
      setPermissions(permsRes.data || []);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load roles and permissions' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Group permissions by module
  const groupedPermissions = permissions.reduce((acc, p) => {
    const mod = p.module || 'other';
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(p);
    return acc;
  }, {} as Record<string, PermissionItem[]>);

  const handleOpenCreate = () => {
    setCreateName('');
    setCreateDesc('');
    setCreatePerms([]);
    setOpenCreate(true);
  };

  const handleToggleCreatePerm = (code: string) => {
    setCreatePerms((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFeedback(null);
    try {
      await roleService.createRole({
        name: createName.trim(),
        description: createDesc.trim() || undefined,
        permissions: createPerms,
      });
      setFeedback({ type: 'success', message: 'Role created successfully!' });
      setOpenCreate(false);
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create role' });
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEditPerms = (role: RoleItem) => {
    setSelectedRole(role);
    setEditPerms(role.permissions || []);
  };

  const handleToggleEditPerm = (code: string) => {
    setEditPerms((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSaveRolePerms = async () => {
    if (!selectedRole) return;
    setSavingPerms(true);
    setFeedback(null);
    try {
      await roleService.updateRolePermissions(selectedRole.id, editPerms);
      setFeedback({ type: 'success', message: `Permissions updated for ${selectedRole.name}` });
      setSelectedRole(null);
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update permissions' });
    } finally {
      setSavingPerms(false);
    }
  };

  const handleDeleteRole = async (role: RoleItem) => {
    if (!confirm(`Are you sure you want to delete the role "${role.name}"?`)) return;
    setFeedback(null);
    try {
      await roleService.deleteRole(role.id);
      setFeedback({ type: 'success', message: `Role "${role.name}" deleted successfully` });
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete role' });
    }
  };

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a' }}>
            Roles & Permissions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage system roles and create customized access permissions for cashiers, managers, and accountants.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
          sx={{
            bgcolor: '#0f172a',
            color: '#ffffff',
            fontWeight: 600,
            '&:hover': { bgcolor: '#1e293b' },
          }}
        >
          Create Custom Role
        </Button>
      </Box>

      {feedback && (
        <Alert severity={feedback.type} sx={{ mb: 3 }} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 3,
          }}
        >
          {roles.map((role) => (
            <Card
              key={role.id}
              elevation={0}
              sx={{
                borderRadius: 3,
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: '#ffffff',
              }}
            >
              <CardContent sx={{ flex: 1, p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SecurityIcon sx={{ color: role.isSystem ? '#d97706' : '#3b82f6' }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
                      {role.name}
                    </Typography>
                  </Box>
                  {role.isSystem ? (
                    <Chip
                      icon={<LockIcon fontSize="small" />}
                      label="System Role"
                      size="small"
                      sx={{
                        bgcolor: '#fef3c7',
                        color: '#92400e',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                      }}
                    />
                  ) : (
                    <Chip
                      label="Custom Role"
                      size="small"
                      sx={{
                        bgcolor: '#e0f2fe',
                        color: '#0369a1',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                      }}
                    />
                  )}
                </Box>

                <Typography variant="body2" sx={{ color: '#64748b', mb: 2, minHeight: 40 }}>
                  {role.description || 'No description provided.'}
                </Typography>

                <Divider sx={{ mb: 2 }} />

                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Granted Privileges ({role.permissions?.length || 0})
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, mt: 1 }}>
                    {role.permissions?.length ? (
                      role.permissions.map((p) => (
                        <Chip
                          key={p}
                          label={p}
                          size="small"
                          sx={{
                            fontSize: '0.7rem',
                            height: 22,
                            bgcolor: '#f1f5f9',
                            color: '#334155',
                          }}
                        />
                      ))
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        No privileges assigned.
                      </Typography>
                    )}
                  </Box>
                </Box>
              </CardContent>

              <CardActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #f1f5f9', justifyContent: 'flex-end', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => handleOpenEditPerms(role)}
                  disabled={role.name === 'Owner'}
                >
                  Edit Permissions
                </Button>
                {!role.isSystem && (
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDeleteRole(role)}
                  >
                    Delete
                  </Button>
                )}
              </CardActions>
            </Card>
          ))}
        </Box>
      )}

      {/* Create Role Modal */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Create New Custom Role</DialogTitle>
        <form onSubmit={handleCreateRole}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <TextField
              label="Role Name"
              required
              fullWidth
              size="small"
              placeholder="e.g. Senior Cashier or Inventory Supervisor"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              size="small"
              placeholder="Explain the responsibilities and scope of this role"
              value={createDesc}
              onChange={(e) => setCreateDesc(e.target.value)}
            />

            <Divider />

            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Select Permissions Matrix
            </Typography>

            <Box sx={{ maxHeight: 340, overflowY: 'auto', pr: 1 }}>
              {Object.entries(groupedPermissions).map(([mod, perms]) => (
                <Box key={mod} sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>
                    Module: {mod}
                  </Typography>
                  <FormGroup sx={{ pl: 1, mt: 0.5 }}>
                    {perms.map((p) => (
                      <FormControlLabel
                        key={p.code}
                        control={
                          <Checkbox
                            size="small"
                            checked={createPerms.includes(p.code)}
                            onChange={() => handleToggleCreatePerm(p.code)}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                              {p.code}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {p.description}
                            </Typography>
                          </Box>
                        }
                        sx={{ mb: 0.5, alignItems: 'flex-start' }}
                      />
                    ))}
                  </FormGroup>
                </Box>
              ))}
            </Box>
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
              {creating ? 'Creating…' : 'Create Role'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Edit Role Permissions Modal */}
      <Dialog open={!!selectedRole} onClose={() => setSelectedRole(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Configure Permissions: {selectedRole?.name}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Check or uncheck the specific capabilities granted to users holding this role.
          </Typography>

          <Box sx={{ maxHeight: 380, overflowY: 'auto', pr: 1 }}>
            {Object.entries(groupedPermissions).map(([mod, perms]) => (
              <Box key={mod} sx={{ mb: 2.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>
                  Module: {mod}
                </Typography>
                <FormGroup sx={{ pl: 1, mt: 0.5 }}>
                  {perms.map((p) => (
                    <FormControlLabel
                      key={p.code}
                      control={
                        <Checkbox
                          size="small"
                          checked={editPerms.includes(p.code)}
                          onChange={() => handleToggleEditPerm(p.code)}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                            {p.code}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {p.description}
                          </Typography>
                        </Box>
                      }
                      sx={{ mb: 0.5, alignItems: 'flex-start' }}
                    />
                  ))}
                </FormGroup>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setSelectedRole(null)} disabled={savingPerms}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveRolePerms}
            variant="contained"
            disabled={savingPerms}
            sx={{ bgcolor: '#0f172a', color: '#fff', '&:hover': { bgcolor: '#1e293b' } }}
          >
            {savingPerms ? 'Saving…' : 'Save Permissions'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

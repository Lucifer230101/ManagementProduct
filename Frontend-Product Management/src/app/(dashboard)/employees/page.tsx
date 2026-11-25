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
  Tooltip,
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Badge as BadgeIcon,
  Lock as LockIcon,
} from '@mui/icons-material';

import { employeeService, CreateEmployeePayload, UpdateEmployeePayload } from '@/services/api/employeeService';
import { roleService } from '@/services/api/roleService';
import { moduleService } from '@/services/api/moduleService';
import { EmployeeItem, RoleItem } from '@/types';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleDisabled, setModuleDisabled] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Add Employee Modal
  const [openAdd, setOpenAdd] = useState(false);
  const [addData, setAddData] = useState<CreateEmployeePayload>({
    name: '',
    email: '',
    phone: '',
    password: '',
    roleId: '',
    designation: '',
    joiningDate: new Date().toISOString().split('T')[0],
    salary: null,
    address: '',
    emergencyContact: '',
  });
  const [creating, setCreating] = useState(false);

  // Edit Employee Modal
  const [editEmployee, setEditEmployee] = useState<EmployeeItem | null>(null);
  const [editData, setEditData] = useState<UpdateEmployeePayload>({
    designation: '',
    joiningDate: '',
    salary: null,
    address: '',
    emergencyContact: '',
  });
  const [updating, setUpdating] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      // Check if employee module is enabled
      const modulesRes = await moduleService.getModules();
      const empModule = modulesRes.data?.find((m) => m.moduleName === 'employee');
      if (empModule && !empModule.isEnabled) {
        setModuleDisabled(true);
        setLoading(false);
        return;
      }

      setModuleDisabled(false);
      const [empRes, rolesRes] = await Promise.all([
        employeeService.getEmployees(),
        roleService.getRoles(),
      ]);
      setEmployees(empRes.data || []);
      setRoles(rolesRes.data || []);
      if (!addData.roleId && rolesRes.data?.length) {
        setAddData((prev) => ({ ...prev, roleId: rolesRes.data[0].id }));
      }
    } catch (err: any) {
      if (err.message?.includes('Module is disabled') || err.message?.includes('403')) {
        setModuleDisabled(true);
      } else {
        setFeedback({ type: 'error', message: err.message || 'Failed to load employees' });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFeedback(null);
    try {
      await employeeService.createEmployee({
        ...addData,
        salary: addData.salary !== null && addData.salary !== undefined && String(addData.salary).trim() !== ''
          ? Number(addData.salary)
          : null,
      });
      setFeedback({ type: 'success', message: 'Employee added successfully!' });
      setOpenAdd(false);
      setAddData({
        name: '',
        email: '',
        phone: '',
        password: '',
        roleId: roles[0]?.id || '',
        designation: '',
        joiningDate: new Date().toISOString().split('T')[0],
        salary: null,
        address: '',
        emergencyContact: '',
      });
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to add employee' });
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEdit = (emp: EmployeeItem) => {
    setEditEmployee(emp);
    setEditData({
      designation: emp.designation || '',
      joiningDate: emp.joiningDate ? emp.joiningDate.split('T')[0] : '',
      salary: emp.salary ?? null,
      address: emp.address || '',
      emergencyContact: emp.emergencyContact || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editEmployee) return;
    setUpdating(true);
    setFeedback(null);
    try {
      await employeeService.updateEmployee(editEmployee.id, {
        ...editData,
        salary: editData.salary !== null && editData.salary !== undefined && String(editData.salary).trim() !== ''
          ? Number(editData.salary)
          : null,
      });
      setFeedback({ type: 'success', message: 'Employee profile updated successfully!' });
      setEditEmployee(null);
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update employee' });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteEmployee = async (emp: EmployeeItem) => {
    if (!confirm(`Are you sure you want to remove employee profile for "${emp.name}"?`)) return;
    setFeedback(null);
    try {
      await employeeService.deleteEmployee(emp.id);
      setFeedback({ type: 'success', message: `Employee "${emp.name}" profile deleted` });
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete employee' });
    }
  };

  if (moduleDisabled) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', py: 4 }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Employee Management Module is Disabled
          </Typography>
          <Typography variant="body2">
            The Employee module has been turned off in Shop Module Settings. To view, hire, and manage staff profiles,
            enable the Employee module.
          </Typography>
        </Alert>
        <Button variant="contained" href="/modules" sx={{ bgcolor: '#0f172a', color: '#fff' }}>
          Go to Module Settings
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a' }}>
            Employee Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage designations, joining dates, salary packages, and emergency contacts.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => setOpenAdd(true)}
          sx={{
            bgcolor: '#0f172a',
            color: '#ffffff',
            fontWeight: 600,
            '&:hover': { bgcolor: '#1e293b' },
          }}
        >
          Add Employee
        </Button>
      </Box>

      {feedback && (
        <Alert severity={feedback.type} sx={{ mb: 3 }} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      )}

      {/* Employees Table */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden', bgcolor: '#ffffff' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Employee</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Designation & Role</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Joining Date</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Salary</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Emergency Contact</TableCell>
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
              ) : employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: '#64748b' }}>
                    No employees registered yet.
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((emp) => (
                  <TableRow key={emp.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                        {emp.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        {emp.email} {emp.phone ? `• ${emp.phone}` : ''}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          icon={<BadgeIcon fontSize="small" />}
                          label={emp.designation || 'Staff'}
                          size="small"
                          sx={{ fontWeight: 600, bgcolor: '#f1f5f9', color: '#1e293b' }}
                        />
                        <Chip
                          label={emp.role}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.85rem', color: '#64748b' }}>
                      {emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell>
                      {emp.salary !== null && emp.salary !== undefined ? (
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                          ₹{Number(emp.salary).toLocaleString()}
                        </Typography>
                      ) : (
                        <Tooltip title="Salary information is restricted to Owners & Managers">
                          <Chip
                            icon={<LockIcon fontSize="small" />}
                            label="Masked"
                            size="small"
                            sx={{ height: 20, fontSize: '0.7rem', bgcolor: '#f8fafc', color: '#94a3b8' }}
                          />
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.85rem', color: '#64748b' }}>
                      {emp.emergencyContact || '—'}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit Employee Profile">
                        <IconButton size="small" onClick={() => handleOpenEdit(emp)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {emp.role !== 'Owner' && (
                        <Tooltip title="Delete Employee">
                          <IconButton size="small" color="error" onClick={() => handleDeleteEmployee(emp)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add Employee Dialog */}
      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Register New Employee</DialogTitle>
        <form onSubmit={handleAddEmployee}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
              Account Credentials
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                label="Full Name"
                required
                size="small"
                value={addData.name}
                onChange={(e) => setAddData({ ...addData, name: e.target.value })}
              />
              <TextField
                label="Email Address"
                type="email"
                required
                size="small"
                value={addData.email}
                onChange={(e) => setAddData({ ...addData, email: e.target.value })}
              />
              <TextField
                label="Phone Number"
                size="small"
                value={addData.phone}
                onChange={(e) => setAddData({ ...addData, phone: e.target.value })}
              />
              <TextField
                label="Password"
                type="password"
                required
                size="small"
                helperText="Temporary login password (min 8 chars)"
                value={addData.password}
                onChange={(e) => setAddData({ ...addData, password: e.target.value })}
              />
            </Box>

            <TextField
              select
              label="Assigned System Role"
              required
              fullWidth
              size="small"
              value={addData.roleId}
              onChange={(e) => setAddData({ ...addData, roleId: e.target.value })}
            >
              {roles.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.name} {r.isSystem ? '(System)' : ''}
                </MenuItem>
              ))}
            </TextField>

            <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', textTransform: 'uppercase', mt: 1 }}>
              Employment Details
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                label="Job Designation"
                size="small"
                placeholder="e.g. Head Cashier or Stock Associate"
                value={addData.designation}
                onChange={(e) => setAddData({ ...addData, designation: e.target.value })}
              />
              <TextField
                label="Joining Date"
                type="date"
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
                value={addData.joiningDate}
                onChange={(e) => setAddData({ ...addData, joiningDate: e.target.value })}
              />
              <TextField
                label="Salary (Monthly)"
                type="number"
                size="small"
                placeholder="₹ Amount"
                value={addData.salary ?? ''}
                onChange={(e) => setAddData({ ...addData, salary: e.target.value ? Number(e.target.value) : null })}
              />
              <TextField
                label="Emergency Contact"
                size="small"
                placeholder="Name & Phone"
                value={addData.emergencyContact}
                onChange={(e) => setAddData({ ...addData, emergencyContact: e.target.value })}
              />
            </Box>
            <TextField
              label="Residential Address"
              multiline
              rows={2}
              size="small"
              value={addData.address}
              onChange={(e) => setAddData({ ...addData, address: e.target.value })}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setOpenAdd(false)} disabled={creating}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={creating}
              sx={{ bgcolor: '#0f172a', color: '#fff', '&:hover': { bgcolor: '#1e293b' } }}
            >
              {creating ? 'Saving…' : 'Add Employee'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={!!editEmployee} onClose={() => setEditEmployee(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Employee: {editEmployee?.name}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Designation"
            size="small"
            value={editData.designation || ''}
            onChange={(e) => setEditData({ ...editData, designation: e.target.value })}
          />
          <TextField
            label="Joining Date"
            type="date"
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            value={editData.joiningDate || ''}
            onChange={(e) => setEditData({ ...editData, joiningDate: e.target.value })}
          />
          <TextField
            label="Salary (Monthly)"
            type="number"
            size="small"
            value={editData.salary ?? ''}
            onChange={(e) => setEditData({ ...editData, salary: e.target.value ? Number(e.target.value) : null })}
          />
          <TextField
            label="Emergency Contact"
            size="small"
            value={editData.emergencyContact || ''}
            onChange={(e) => setEditData({ ...editData, emergencyContact: e.target.value })}
          />
          <TextField
            label="Residential Address"
            multiline
            rows={2}
            size="small"
            value={editData.address || ''}
            onChange={(e) => setEditData({ ...editData, address: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setEditEmployee(null)} disabled={updating}>
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

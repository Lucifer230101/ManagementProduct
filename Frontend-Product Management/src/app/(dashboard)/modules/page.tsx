'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  People as PeopleIcon,
  Inventory2 as InventoryIcon,
  ReceiptLong as BillingIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';

import { moduleService } from '@/services/api/moduleService';

interface ModuleConfig {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  phase: string;
}

const MODULE_DEFINITIONS: ModuleConfig[] = [
  {
    key: 'employee',
    title: 'Employee Profiles & Staff Records',
    description:
      'Manage employee designations, joining dates, sensitive salary masking, and emergency contact directories.',
    icon: <PeopleIcon sx={{ fontSize: 32, color: '#3b82f6' }} />,
    phase: 'Phase 1 Core',
  },
  {
    key: 'inventory',
    title: 'Inventory & Stock Management',
    description:
      'Control product catalogue, pricing, SKU barcodes, category hierarchies, and real-time inventory quantity deductions.',
    icon: <InventoryIcon sx={{ fontSize: 32, color: '#10b981' }} />,
    phase: 'Phase 2 / 3',
  },
  {
    key: 'billing',
    title: 'Point of Sale (POS) & Billing',
    description:
      'Generate retail invoices, apply item-level discounts, process returns, credit notes, and record cash/UPI payments.',
    icon: <BillingIcon sx={{ fontSize: 32, color: '#8b5cf6' }} />,
    phase: 'Phase 2',
  },
];

export default function ModulesPage() {
  const [modules, setModules] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadModules = async () => {
    try {
      setLoading(true);
      const res = await moduleService.getModules();
      const map: Record<string, boolean> = {};
      res.data?.forEach((m) => {
        map[m.moduleName] = m.isEnabled;
      });
      setModules(map);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load shop modules' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModules();
  }, []);

  const handleToggle = async (moduleKey: string) => {
    const currentState = !!modules[moduleKey];
    const newState = !currentState;
    setToggling(moduleKey);
    setFeedback(null);
    try {
      await moduleService.toggleModule(moduleKey, newState);
      setModules((prev) => ({ ...prev, [moduleKey]: newState }));
      setFeedback({
        type: 'success',
        message: `Module "${moduleKey}" has been ${newState ? 'enabled' : 'disabled'} successfully.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || `Failed to toggle module ${moduleKey}` });
    } finally {
      setToggling(null);
    }
  };

  return (
    <Box sx={{ maxWidth: 880, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a' }}>
          Shop Module Configuration
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Activate or deactivate business modules according to your retail store operational needs.
        </Typography>
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {MODULE_DEFINITIONS.map((mod) => {
            const isEnabled = !!modules[mod.key];
            const isTogglingThis = toggling === mod.key;

            return (
              <Card
                key={mod.key}
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: isEnabled ? '1px solid #cbd5e1' : '1px solid #e2e8f0',
                  bgcolor: '#ffffff',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: '#94a3b8',
                  },
                }}
              >
                <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flex: 1, minWidth: 260 }}>
                      <Box sx={{ p: 1, borderRadius: 2, bgcolor: '#f8fafc' }}>{mod.icon}</Box>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5, flexWrap: 'wrap' }}>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
                            {mod.title}
                          </Typography>
                          <Chip
                            label={mod.phase}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              bgcolor: '#f1f5f9',
                              color: '#475569',
                            }}
                          />
                        </Box>
                        <Typography variant="body2" sx={{ color: '#64748b', maxWidth: 540 }}>
                          {mod.description}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Chip
                        icon={isEnabled ? <CheckCircleIcon fontSize="small" /> : <CancelIcon fontSize="small" />}
                        label={isEnabled ? 'Active' : 'Disabled'}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          bgcolor: isEnabled ? '#dcfce7' : '#f1f5f9',
                          color: isEnabled ? '#166534' : '#64748b',
                        }}
                      />
                      <Switch
                        checked={isEnabled}
                        disabled={isTogglingThis}
                        onChange={() => handleToggle(mod.key)}
                        color="primary"
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

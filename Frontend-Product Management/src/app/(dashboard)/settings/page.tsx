'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { Save as SaveIcon, Store as StoreIcon, Shield as ShieldIcon } from '@mui/icons-material';
import { shopService } from '@/services/api/shopService';
import { Shop } from '@/types';

const SHOP_TYPES = [
  { value: 'general', label: 'General Retail Store' },
  { value: 'grocery', label: 'Grocery / Kirana' },
  { value: 'clothing', label: 'Clothing & Footwear' },
  { value: 'pharmacy', label: 'Pharmacy & Medical' },
  { value: 'electronics', label: 'Electronics & Mobile' },
  { value: 'hardware', label: 'Hardware & Wholesale' },
  { value: 'stationery', label: 'Stationery & Books' },
];

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'CAD', 'AUD', 'SGD'];

export default function SettingsPage() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [name, setName] = useState('');
  const [shopType, setShopType] = useState('general');
  const [gstin, setGstin] = useState('');
  const [currency, setCurrency] = useState('INR');

  const loadShop = async () => {
    try {
      setLoading(true);
      const res = await shopService.getCurrentShop();
      if (res.data) {
        setShop(res.data);
        setName(res.data.name);
        setShopType(res.data.shopType || 'general');
        setGstin(res.data.gstin || '');
        setCurrency(res.data.currency || 'INR');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load shop settings' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShop();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSaving(true);
    try {
      const res = await shopService.updateCurrentShop({
        name: name.trim(),
        shopType,
        gstin: gstin.trim() || null,
        currency,
      });
      setShop(res.data);
      setFeedback({ type: 'success', message: 'Shop settings updated successfully!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update shop settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 860, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a' }}>
          Shop Profile & Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure shop name, legal registration details, business category, and base currency.
        </Typography>
      </Box>

      {feedback && (
        <Alert severity={feedback.type} sx={{ mb: 3 }} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <StoreIcon sx={{ color: '#3b82f6', fontSize: 28 }} />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Shop Identity
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Information displayed on invoices and receipts
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Shop Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
              size="small"
              helperText="The public store name that appears on invoices and reports"
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                select
                label="Shop Category / Type"
                value={shopType}
                onChange={(e) => setShopType(e.target.value)}
                required
                fullWidth
                size="small"
                helperText="Enables specialized features (e.g. expiry for pharmacy, serial numbers for electronics)"
              >
                {SHOP_TYPES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Base Currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                required
                fullWidth
                size="small"
                helperText="Default currency code used for all pricing and billing"
              >
                {CURRENCIES.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <TextField
              label="GSTIN / Tax ID"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
              placeholder="e.g. 27AAAAA0000A1Z5 (Optional)"
              fullWidth
              size="small"
              helperText="Government tax registration number (optional for unregistered retailers)"
            />

            <Divider sx={{ my: 1 }} />

            {/* Readonly Technical Metadata */}
            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #f1f5f9' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <ShieldIcon sx={{ fontSize: 18, color: '#64748b' }} />
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  Tenant Metadata (System Generated)
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, fontSize: '0.8rem', color: '#64748b' }}>
                <Box>
                  <strong>Shop ID:</strong> <code style={{ fontSize: '0.75rem' }}>{shop?.id}</code>
                </Box>
                <Box>
                  <strong>Created At:</strong> {shop?.createdAt ? new Date(shop.createdAt).toLocaleDateString() : 'N/A'}
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={saving}
                startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                sx={{
                  bgcolor: '#0f172a',
                  color: '#ffffff',
                  fontWeight: 600,
                  '&:hover': { bgcolor: '#1e293b' },
                }}
              >
                {saving ? 'Saving Changes…' : 'Save Settings'}
              </Button>
            </Box>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}

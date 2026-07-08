'use client';

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface ScanResult {
  success: boolean;
  message: string;
  data?: any;
}

export function useMobileScan(operatorId: string) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scanBarcode = useCallback(async (barcode: string): Promise<ScanResult> => {
    if (!barcode.trim()) {
      return { success: false, message: 'Barcode kosong' };
    }

    setLoading(true);
    setResult(null);

    try {
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(50);

      const { data, error } = await supabase.rpc('process_auto_sorting', {
        p_barcode: barcode.trim(),
        p_operator_id: operatorId,
      });

      if (error) throw error;

      const response = typeof data === 'string' ? JSON.parse(data) : data;

      const scanResult: ScanResult = {
        success: response.success || false,
        message: response.message || 'Proses selesai',
        data: response,
      };

      setResult(scanResult);

      // Auto clear success message
      if (scanResult.success) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          setResult(null);
        }, 2000);
      }

      return scanResult;
    } catch (error: any) {
      const scanResult: ScanResult = {
        success: false,
        message: error.message || 'Error sistem',
      };
      setResult(scanResult);
      
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
      
      return scanResult;
    } finally {
      setLoading(false);
    }
  }, [operatorId]);

  const clearResult = useCallback(() => {
    setResult(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return {
    scanBarcode,
    loading,
    result,
    clearResult,
  };
}
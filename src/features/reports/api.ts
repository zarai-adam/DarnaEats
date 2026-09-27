import { useMutation } from '@tanstack/react-query';
import type { ReportReason, ReportTargetType } from '@shared/constants';
import { track } from '@/services/analytics';
import { api } from '@/services/firebase/callables';

export function useCreateReport() {
  return useMutation({
    mutationFn: (input: {
      targetType: ReportTargetType;
      targetId: string;
      reason: ReportReason;
      description?: string;
    }) => api.createReport(input),
    onSuccess: (_r, input) => track('report_submitted', { target_type: input.targetType }),
  });
}

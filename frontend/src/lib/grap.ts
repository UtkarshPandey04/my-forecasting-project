import { ForecastPoint } from './types';

export type GrapStage = 'I' | 'II' | 'III' | 'IV';

export interface GrapAssessment {
  stage: GrapStage;
  label: 'Poor' | 'Very Poor' | 'Severe' | 'Severe+';
  minAqi: number;
  color: string;
  actions: string[];
}

export const getGrapStage = (aqi: number): GrapAssessment => {
  if (aqi > 450) return { stage: 'IV', label: 'Severe+', minAqi: 451, color: 'rose', actions: ['Emergency response escalation', 'Construction and demolition ban', 'Consider school closure and odd-even measures'] };
  if (aqi > 400) return { stage: 'III', label: 'Severe', minAqi: 401, color: 'red', actions: ['Stop major construction and demolition', 'Restrict diesel generator use', 'Prepare school and hospital advisories'] };
  if (aqi > 300) return { stage: 'II', label: 'Very Poor', minAqi: 301, color: 'orange', actions: ['Enforce dust suppression', 'Increase public transport and parking controls', 'Issue sensitive-group health advisory'] };
  return { stage: 'I', label: 'Poor', minAqi: 201, color: 'amber', actions: ['Intensify road cleaning and inspections', 'Verify pollution-control compliance', 'Issue preventive citizen advisory'] };
};

export const firstGrapTrigger = (points?: ForecastPoint[] | null): { point: ForecastPoint; assessment: GrapAssessment } | null => {
  if (!points || !Array.isArray(points) || points.length === 0) return null;
  const point = points.find((item) => (item?.aqi_predicted ?? 0) >= 201);
  return point ? { point, assessment: getGrapStage(point.aqi_predicted ?? 0) } : null;
};


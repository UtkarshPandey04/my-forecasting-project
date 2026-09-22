import { jsPDF } from 'jspdf';

export interface ShiftDossierData {
  stationDisplayName: string;
  stationId: string;
  activeAqi: number;
  aqiStandard: 'cpcb' | 'epa';
  effectiveStage: string;
  isManualOverride: boolean;
  enforcedMandatesCount: number;
  totalMandatesCount: number;
  fieldUnits: Array<{
    unitCode: string;
    name: string;
    type: string;
    status: string;
    assignedLocation: string;
    resourceLevelPct: number;
    resourceLabel?: string;
    operator: string;
    operatorPhone: string;
  }>;
  triggeredSopList: Array<{
    code?: string;
    id?: string;
    title: string;
    impact: string;
    targetAgency: string;
  }>;
  recentDispatches: Array<{
    timestamp?: string;
    created_at?: string;
    target?: string;
    stakeholder?: string;
    channels?: string[] | string;
    priority?: string;
    severity?: string;
    message: string;
  }>;
}

export function generateShiftDossierPdf(data: ShiftDossierData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      drawHeaderSmall();
    }
  };

  const drawHeaderSmall = () => {
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(203, 213, 225);
    doc.text('AEROSENSE AIR QUALITY COMMAND & CONTROL — SHIFT DOSSIER (CONT.)', margin + 3, y + 5.5);
    y += 12;
  };

  // ── 1. MAIN HEADER BANNER ──
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'F');

  // Decorative Accent Strip
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(margin, y, 3, 24, 'F');

  // Main Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('AEROSENSE AIRSHED INCIDENT COMMAND & RESPONSE', margin + 6, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Statutory CAQM Compliance & Operational Shift Handover Dossier', margin + 6, y + 14);

  const reportRef = `REF-NCR-${data.stationId.toUpperCase().replace(/[^A-Z0-9]/g, '')}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(245, 158, 11);
  doc.text(reportRef, pageWidth - margin - 5, y + 8, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  const formattedDate = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'medium'
  });
  doc.text(`Generated: ${formattedDate} IST`, pageWidth - margin - 5, y + 14, { align: 'right' });
  doc.text('Jurisdiction: NCR Air Quality Region (Delhi)', pageWidth - margin - 5, y + 19, { align: 'right' });

  y += 28;

  // ── 2. EXECUTIVE AIRSHED & GRAP STATUS SUMMARY ──
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(margin, y, contentWidth, 26, 1.5, 1.5, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 26, 1.5, 1.5, 'S');

  // Metric 1: Station
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('STATION / AIRSHED', margin + 4, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(data.stationDisplayName, margin + 4, y + 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Station ID: ${data.stationId}`, margin + 4, y + 18);

  // Metric 2: Live AQI
  const col2X = margin + 55;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`TELEMETRY AQI (${data.aqiStandard.toUpperCase()})`, col2X, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  const aqiColor = data.activeAqi > 400 ? [190, 18, 60] : data.activeAqi > 300 ? [180, 83, 9] : [16, 185, 129];
  doc.setTextColor(aqiColor[0], aqiColor[1], aqiColor[2]);
  doc.text(`${Math.round(data.activeAqi)}`, col2X, y + 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const aqiCategory = data.activeAqi > 450 ? 'Severe+' : data.activeAqi > 400 ? 'Severe' : data.activeAqi > 300 ? 'Very Poor' : data.activeAqi > 200 ? 'Poor' : 'Moderate';
  doc.text(`Category: ${aqiCategory}`, col2X, y + 21);

  // Metric 3: GRAP Statutory Stage
  const col3X = margin + 105;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('ENFORCED GRAP PROTOCOL', col3X, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`STAGE ${data.effectiveStage}`, col3X, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(data.isManualOverride ? 220 : 100, data.isManualOverride ? 38 : 116, data.isManualOverride ? 38 : 139);
  doc.text(data.isManualOverride ? 'Mode: Manual Commander Override' : 'Mode: Automated Telemetry Trigger', col3X, y + 21);

  // Metric 4: Statutory Mandates
  const col4X = margin + 148;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('MANDATE COMPLIANCE', col4X, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(2, 132, 199);
  doc.text(`${data.enforcedMandatesCount} / ${data.totalMandatesCount}`, col4X, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const compliancePct = Math.round((data.enforcedMandatesCount / Math.max(1, data.totalMandatesCount)) * 100);
  doc.text(`Execution Rate: ${compliancePct}%`, col4X, y + 21);

  y += 31;

  // ── 3. TACTICAL FIELD FLEET READINESS ──
  checkPageBreak(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. TACTICAL FIELD FLEET & UNIT DISPATCH STATUS', margin, y);
  y += 4;

  // Table Header
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('UNIT CODE', margin + 2, y + 4.2);
  doc.text('CLASSIFICATION / NAME', margin + 24, y + 4.2);
  doc.text('ASSIGNED SECTOR', margin + 74, y + 4.2);
  doc.text('STATUS', margin + 114, y + 4.2);
  doc.text('RESOURCE', margin + 138, y + 4.2);
  doc.text('OPERATOR CONTACT', margin + 158, y + 4.2);
  y += 6;

  // Table Rows
  data.fieldUnits.forEach((unit, idx) => {
    checkPageBreak(7);
    doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 252 : 255);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 6, margin + contentWidth, y + 6);

    doc.setFont('courier', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(unit.unitCode, margin + 2, y + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.text(unit.name.length > 28 ? unit.name.slice(0, 26) + '...' : unit.name, margin + 24, y + 4.2);

    doc.text(unit.assignedLocation.length > 22 ? unit.assignedLocation.slice(0, 20) + '...' : unit.assignedLocation, margin + 74, y + 4.2);

    // Status pill
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    if (unit.status === 'ON_SCENE') {
      doc.setTextColor(16, 185, 129); // emerald
    } else if (unit.status === 'DISPATCHED') {
      doc.setTextColor(2, 132, 199); // sky
    } else if (unit.status === 'RECHARGING') {
      doc.setTextColor(217, 119, 6); // amber
    } else {
      doc.setTextColor(100, 116, 139); // slate
    }
    doc.text(unit.status.replace('_', ' '), margin + 114, y + 4.2);

    // Resource
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(15, 23, 42);
    doc.text(`${unit.resourceLevelPct}%`, margin + 138, y + 4.2);

    // Operator
    doc.text(`${unit.operator} (${unit.operatorPhone})`, margin + 158, y + 4.2);

    y += 6;
  });

  y += 5;

  // ── 4. ACTIVE TACTICAL SOPS & RELIEF ESTIMATION ──
  checkPageBreak(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. ACTIVE EMERGENCY SOPS & AIRSHED RELIEF IMPACT', margin, y);
  y += 4;

  if (data.triggeredSopList.length === 0) {
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 8, 'S');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('No tactical emergency SOPs currently triggered. Normal operational surveillance active.', margin + 4, y + 5);
    y += 12;
  } else {
    // Table Header
    doc.setFillColor(30, 41, 59);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text('SOP CODE', margin + 2, y + 4.2);
    doc.text('TACTICAL DIRECTIVE', margin + 24, y + 4.2);
    doc.text('ENFORCING AUTHORITY', margin + 110, y + 4.2);
    doc.text('ESTIMATED AIRSHED BENEFIT', margin + 150, y + 4.2);
    y += 6;

    data.triggeredSopList.forEach((sop, idx) => {
      checkPageBreak(7);
      doc.setFillColor(idx % 2 === 0 ? 254 : 255, idx % 2 === 0 ? 243 : 255, idx % 2 === 0 ? 199 : 255); // light amber tint
      doc.rect(margin, y, contentWidth, 6, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + 6, margin + contentWidth, y + 6);

      doc.setFont('courier', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(180, 83, 9);
      doc.text(sop.code || sop.id || 'SOP', margin + 2, y + 4.2);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(15, 23, 42);
      doc.text(sop.title.length > 48 ? sop.title.slice(0, 46) + '...' : sop.title, margin + 24, y + 4.2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(71, 85, 105);
      doc.text(sop.targetAgency, margin + 110, y + 4.2);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text(sop.impact, margin + 150, y + 4.2);

      y += 6;
    });

    y += 5;
  }

  // ── 5. RECENT DISPATCHES AUDIT LOG ──
  checkPageBreak(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('3. RECENT TELEMETRIC DISPATCHES & ADVISORIES (LAST 10)', margin, y);
  y += 4;

  if (data.recentDispatches.length === 0) {
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 8, 'S');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('No dispatches recorded in this active shift cycle.', margin + 4, y + 5);
    y += 12;
  } else {
    // Table Header
    doc.setFillColor(30, 41, 59);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text('TIMESTAMP', margin + 2, y + 4.2);
    doc.text('TARGET AUDIENCE', margin + 28, y + 4.2);
    doc.text('PRIORITY', margin + 66, y + 4.2);
    doc.text('CHANNELS', margin + 86, y + 4.2);
    doc.text('MESSAGE EXCERPT', margin + 116, y + 4.2);
    y += 6;

    data.recentDispatches.slice(0, 8).forEach((d, idx) => {
      checkPageBreak(7);
      doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 252 : 255);
      doc.rect(margin, y, contentWidth, 6, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + 6, margin + contentWidth, y + 6);

      const rawTime = d.timestamp || d.created_at;
      const timeStr = rawTime ? new Date(rawTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Live';
      doc.setFont('courier', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(timeStr, margin + 2, y + 4.2);

      const targetAudience = d.target || d.stakeholder || 'General Public';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(15, 23, 42);
      doc.text(targetAudience.length > 20 ? targetAudience.slice(0, 19) + '..' : targetAudience, margin + 28, y + 4.2);

      const priorityVal = d.priority || d.severity || 'standard';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(priorityVal.toLowerCase() === 'emergency' || priorityVal.toLowerCase() === 'critical' ? 220 : 16, priorityVal.toLowerCase() === 'emergency' || priorityVal.toLowerCase() === 'critical' ? 38 : 149, priorityVal.toLowerCase() === 'emergency' || priorityVal.toLowerCase() === 'critical' ? 38 : 193);
      doc.text(priorityVal.toUpperCase(), margin + 66, y + 4.2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      const chStr = Array.isArray(d.channels) ? d.channels.join(', ') : (typeof d.channels === 'string' ? d.channels : 'Direct');
      doc.text(chStr.length > 14 ? chStr.slice(0, 13) + '..' : chStr, margin + 86, y + 4.2);

      doc.setTextColor(71, 85, 105);
      const msgStr = (d.message || '').replace(/[\n\r]+/g, ' ');
      doc.text(msgStr.length > 44 ? msgStr.slice(0, 42) + '...' : msgStr, margin + 116, y + 4.2);

      y += 6;
    });

    y += 6;
  }

  // ── 6. STATUTORY SIGN-OFF & HANDOVER ATTESTATION ──
  checkPageBreak(32);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, contentWidth, 24, 1.5, 1.5, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 24, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('STATUTORY ATTESTATION & SHIFT HANDOVER SIGN-OFF', margin + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text('I hereby attest that the tactical assets, air quality telemetry, and GRAP statutory enforcement directives listed above represent the true operational posture for this shift.', margin + 4, y + 10, { maxWidth: contentWidth - 8 });

  // Signature lines
  const sigY = y + 19;
  doc.setDrawColor(148, 163, 184);
  doc.line(margin + 4, sigY, margin + 54, sigY);
  doc.line(margin + 64, sigY, margin + 114, sigY);
  doc.line(margin + 124, sigY, margin + 174, sigY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(71, 85, 105);
  doc.text('INCIDENT COMMANDER SIGNATURE', margin + 4, sigY + 3);
  doc.text('AIR QUALITY SCIENTIST (IMD / CPCB)', margin + 64, sigY + 3);
  doc.text('INCOMING RELIEVING OFFICER', margin + 124, sigY + 3);

  // Save the PDF
  const filename = `AeroSense-Shift-Handover-${data.stationId}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

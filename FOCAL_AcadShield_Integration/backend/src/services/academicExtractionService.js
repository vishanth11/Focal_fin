/**
 * AI/OCR Academic Document Extraction Service.
 *
 * NOTE: Per AcadShield security requirements, AI/OCR assists extraction and validation;
 * it must NOT automatically authorize issuance or establish that an academic record is authentic.
 * The authorized university issuer must review and approve the extracted data before issuing.
 */

function simulateExtraction(fileBuffer, mimeType, originalName, studentHint = {}) {
  const inconsistencies = [];
  const textContent = fileBuffer.toString('utf8');

  // Basic heuristic scan of buffer content for common patterns
  const nameMatch = textContent.match(/Name:\s*([^\r\n]+)/i) || textContent.match(/Student:\s*([^\r\n]+)/i);
  const rollMatch = textContent.match(/Enrollment(?:\s*No|\s*Number|\s*ID)?:\s*([A-Z0-9_-]+)/i) ||
                    textContent.match(/Roll(?:\s*No|\s*Number)?:\s*([A-Z0-9_-]+)/i) ||
                    originalName.match(/([A-Z0-9]{6,12})/i);
  const degreeMatch = textContent.match(/Degree:\s*([^\r\n]+)/i) ||
                      textContent.match(/Bachelor|Master|B\.Tech|M\.Tech|B\.Sc|M\.Sc|Ph\.D/i);
  const cgpaMatch = textContent.match(/CGPA:\s*([0-9.]+)/i) || textContent.match(/GPA:\s*([0-9.]+)/i);

  const extracted = {
    detectedStudentName: nameMatch ? nameMatch[1].trim() : (studentHint.name || 'Student Candidate'),
    detectedEnrollmentNumber: rollMatch ? rollMatch[1].trim() : (studentHint.enrollmentNumber || 'ENR-' + Date.now().toString().slice(-6)),
    detectedDegree: degreeMatch ? (degreeMatch[1] || degreeMatch[0]).trim() : (studentHint.degree || 'Bachelor of Technology'),
    detectedDepartment: studentHint.department || 'Computer Science & Engineering',
    detectedCgpa: cgpaMatch ? cgpaMatch[1] : (studentHint.cgpa ? String(studentHint.cgpa) : '8.85'),
    detectedIssueDate: new Date().toISOString().split('T')[0],
    fileType: mimeType || 'application/pdf',
    fileName: originalName
  };

  // Check for inconsistencies between student profile and extracted metadata
  if (studentHint.name && extracted.detectedStudentName.toLowerCase() !== studentHint.name.toLowerCase()) {
    if (!extracted.detectedStudentName.toLowerCase().includes(studentHint.name.toLowerCase().split(' ')[0])) {
      inconsistencies.push(`Name variance: profile says "${studentHint.name}", document text reads "${extracted.detectedStudentName}".`);
    }
  }

  if (studentHint.enrollmentNumber && extracted.detectedEnrollmentNumber.toUpperCase() !== studentHint.enrollmentNumber.toUpperCase()) {
    inconsistencies.push(`Enrollment number variance: profile says "${studentHint.enrollmentNumber}", document extracted "${extracted.detectedEnrollmentNumber}".`);
  }

  // Calculate AI confidence score (0 to 100)
  let confidenceScore = 94;
  if (inconsistencies.length > 0) {
    confidenceScore -= (inconsistencies.length * 20);
  }

  return {
    confidenceScore: Math.max(confidenceScore, 35),
    extractedData: extracted,
    inconsistencies,
    requiresManualReview: inconsistencies.length > 0 || confidenceScore < 85
  };
}

module.exports = {
  simulateExtraction
};

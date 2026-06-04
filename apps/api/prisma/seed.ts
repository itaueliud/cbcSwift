import { prisma } from "../dist/prisma.js";
import { hashPassword } from "../dist/auth.js";

/**
 * Idempotent seed – safe to run multiple times.
 * Checks if data already exists before inserting.
 */
async function main() {
  console.log("Starting CBCNexus seed...");

  // ── Passwords ────────────────────────────────────────────────────────────
  const [hqPassword, schoolPassword, principalPassword, teacherPassword,
         studentPassword, parentPassword, financePassword] = await Promise.all([
    hashPassword("techswifttrix@2026!"),
    hashPassword("School@2025!"),
    hashPassword("Principal@2025!"),
    hashPassword("Teacher@2025!"),
    hashPassword("Student@2025!"),
    hashPassword("Parent@2025!"),
    hashPassword("Finance@2025!"),
  ]);

  // ── HQ Platform User ──────────────────────────────────────────────────────
  const hq = await prisma.platformUser.upsert({
    where: { email: "techswifttrix361@gmail.com" },
    update: { passwordHash: hqPassword },
    create: {
      fullName: "TechSwiftTrix Admin",
      email: "techswifttrix361@gmail.com",
      passwordHash: hqPassword,
      hqRole: "SUPER_ADMIN",
    },
  });

  // ── Subscription Plan ─────────────────────────────────────────────────────
  const plan = await prisma.subscriptionPlan.upsert({
    where: { planId: "starter-plan" },
    update: {},
    create: {
      planId: "starter-plan",
      planName: "Starter",
      maxStudents: 200,
      maxStaff: 20,
      storageGb: 5,
      priceKes: 4500,
      billingCycle: "TERMLY",
      featuresJson: JSON.stringify(["CBC_GRADING", "ATTENDANCE", "FEE_COLLECTION"]),
    },
  });

  // ── Platform Dashboards ───────────────────────────────────────────────────
  const dashboardSeeds = [
    { dashboardKey: "ADMIN",     dashboardName: "School Admin Dashboard",   tierScope: "ALL",     icon: "🏫", description: "Full school management OS" },
    { dashboardKey: "PRINCIPAL", dashboardName: "Principal Dashboard",      tierScope: "ALL",     icon: "👨‍💼", description: "Academic oversight and approvals" },
    { dashboardKey: "TEACHER",   dashboardName: "Teacher Dashboard",        tierScope: "ALL",     icon: "👩‍🏫", description: "Classes, grades, attendance" },
    { dashboardKey: "STUDENT",   dashboardName: "Student Dashboard",        tierScope: "ALL",     icon: "🧑‍🎓", description: "Learning and portfolio" },
    { dashboardKey: "PARENT",    dashboardName: "Parent Dashboard",         tierScope: "ALL",     icon: "👨‍👩‍👧", description: "Child monitoring and fees" },
    { dashboardKey: "FINANCE",   dashboardName: "Finance Dashboard",        tierScope: "ALL",     icon: "💰", description: "Fees, payroll, expenses" },
    { dashboardKey: "PRIMARY",   dashboardName: "Primary Tier System",      tierScope: "PRIMARY", icon: "🔵", description: "Teacher-centric CBC system" },
    { dashboardKey: "JSS",       dashboardName: "Junior Secondary System",  tierScope: "JSS",     icon: "🟢", description: "Hybrid learner system" },
    { dashboardKey: "SSS",       dashboardName: "Senior Secondary System",  tierScope: "SSS",     icon: "🟣", description: "Career pathway engine" },
  ] as const;

  const dashboards: Record<string, string> = {};
  for (const d of dashboardSeeds) {
    const created = await prisma.platformDashboard.upsert({
      where: { dashboardKey: d.dashboardKey },
      update: {},
      create: { dashboardKey: d.dashboardKey, dashboardName: d.dashboardName, tierScope: d.tierScope, icon: d.icon, description: d.description },
    });
    dashboards[d.dashboardKey] = created.dashboardId;
  }

  // ── Platform Features ─────────────────────────────────────────────────────
  const featureSeeds = [
    ["SCHOOL_OVERVIEW",    "School Overview & Analytics",    "ADMIN",     "ANALYTICS", true],
    ["STUDENT_MGMT",       "Student Management",             "ADMIN",     "ACADEMIC",  true],
    ["STAFF_MGMT",         "Staff Management",               "ADMIN",     "HR",        true],
    ["CLASS_MGMT",         "Class & Stream Management",      "ADMIN",     "ACADEMIC",  true],
    ["MINISTRY_REPORTS",   "Ministry & KNEC Reports",        "ADMIN",     "COMPLIANCE",true],
    ["CBC_COMPLIANCE",     "CBC Compliance Monitor",         "PRINCIPAL", "COMPLIANCE",true],
    ["SCHOOL_ANALYTICS",   "School Performance Analytics",   "PRINCIPAL", "ANALYTICS", true],
    ["REPORT_APPROVAL",    "Report Card Approval",           "PRINCIPAL", "ACADEMIC",  true],
    ["GRADE_ENTRY",        "CBC Grade Entry",                "TEACHER",   "ACADEMIC",  true],
    ["ATTENDANCE_MARK",    "Attendance Marking",             "TEACHER",   "ACADEMIC",  true],
    ["ASSIGNMENTS_MGR",    "Assignment Manager",             "TEACHER",   "ACADEMIC",  true],
    ["PORTFOLIO_UPLOAD",   "Portfolio Evidence Upload",      "TEACHER",   "ACADEMIC",  true],
    ["LEARNING_MATERIALS", "Learning Materials",             "STUDENT",   "ACADEMIC",  true],
    ["MY_ASSIGNMENTS",     "My Assignments",                 "STUDENT",   "ACADEMIC",  true],
    ["MY_PORTFOLIO",       "CBC Portfolio",                  "STUDENT",   "ACADEMIC",  true],
    ["MY_RESULTS",         "My Results & Reports",           "STUDENT",   "ACADEMIC",  true],
    ["CHILD_PERFORMANCE",  "Child Performance View",         "PARENT",    "ACADEMIC",  true],
    ["FEES_VIEW",          "Fee Statements & Payments",      "PARENT",    "FINANCE",   true],
    ["ATTENDANCE_VIEW",    "Attendance View",                "PARENT",    "ACADEMIC",  true],
    ["FEE_COLLECTION",     "Fee Collection & Receipts",      "FINANCE",   "FINANCE",   true],
    ["EXPENSE_TRACKING",   "Expense Tracking",               "FINANCE",   "FINANCE",   true],
    ["PAYROLL_MGMT",       "Payroll Management",             "FINANCE",   "FINANCE",   true],
    ["PRIMARY_PORTFOLIO",  "Primary CBC Portfolio",          "PRIMARY",   "ACADEMIC",  true],
    ["KPSEA_PREP",         "KPSEA Preparation Hub",          "PRIMARY",   "ACADEMIC",  true],
    ["FOUNDATIONAL_SKILLS","Foundational Skills Tracker",    "PRIMARY",   "ACADEMIC",  true],
    ["JSS_PORTFOLIO",      "JSS Student Portfolio",          "JSS",       "ACADEMIC",  true],
    ["COMPETENCY_TRACKER", "CBC Competency Tracker",         "JSS",       "ACADEMIC",  true],
    ["SSS_CAREER_BUILDER", "Career Portfolio Builder",       "SSS",       "ACADEMIC",  true],
    ["PATHWAY_DASHBOARD",  "Pathway Dashboard",              "SSS",       "ACADEMIC",  true],
    ["NATIONAL_EXAM_HUB",  "National Exam Preparation Hub",  "SSS",       "ACADEMIC",  true],
  ] as const;

  const features: Record<string, string> = {};
  for (const [featureKey, featureName, dashboardKey, moduleGroup, isCore] of featureSeeds) {
    const created = await prisma.platformFeature.upsert({
      where: { featureKey },
      update: {},
      create: { featureKey, featureName, dashboardId: dashboards[dashboardKey], moduleGroup, isCore },
    });
    features[featureKey] = created.featureId;
  }

  // ── Demo Tenant ───────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { subdomain: "greenvalley" },
    update: {},
    create: {
      schoolName: "Green Valley Academy",
      subdomain: "greenvalley",
      county: "Nairobi",
      subCounty: "Westlands",
      schoolType: "MIXED",
      registrationNo: "REG/NRB/2018/0042",
      planId: plan.planId,
      onboardedBy: hq.platformUserId,
      contactEmail: "info@greenvalley.ac.ke",
      contactPhone: "+254712345678",
      address: "Green Valley Road, Westlands, Nairobi",
      motto: "Excellence Through Knowledge",
    },
  });

  // ── Demo Users ────────────────────────────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.tenantId, email: "admin@greenvalley.ac.ke" } },
    update: { passwordHash: schoolPassword },
    create: { tenantId: tenant.tenantId, email: "admin@greenvalley.ac.ke", phone: "+254700111001", passwordHash: schoolPassword, role: "ADMIN", fullName: "Admin User" },
  });

  const principalUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.tenantId, email: "principal@greenvalley.ac.ke" } },
    update: { passwordHash: principalPassword },
    create: { tenantId: tenant.tenantId, email: "principal@greenvalley.ac.ke", phone: "+254700111002", passwordHash: principalPassword, role: "PRINCIPAL", fullName: "Dr. Margaret Njeri" },
  });

  const financeUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.tenantId, email: "finance@greenvalley.ac.ke" } },
    update: { passwordHash: financePassword },
    create: { tenantId: tenant.tenantId, email: "finance@greenvalley.ac.ke", phone: "+254700111003", passwordHash: financePassword, role: "FINANCE", fullName: "Peter Mwangi" },
  });

  const teacherUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.tenantId, email: "teacher1@greenvalley.ac.ke" } },
    update: { passwordHash: teacherPassword },
    create: { tenantId: tenant.tenantId, email: "teacher1@greenvalley.ac.ke", phone: "+254711001001", passwordHash: teacherPassword, role: "TEACHER", fullName: "Alice Wanjiku" },
  });

  // Second teacher
  const teacherUser2 = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.tenantId, email: "teacher2@greenvalley.ac.ke" } },
    update: { passwordHash: teacherPassword },
    create: { tenantId: tenant.tenantId, email: "teacher2@greenvalley.ac.ke", phone: "+254711001002", passwordHash: teacherPassword, role: "TEACHER", fullName: "David Ochieng" },
  });

  const studentUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.tenantId, email: "adm001@greenvalley.ac.ke" } },
    update: { passwordHash: studentPassword },
    create: { tenantId: tenant.tenantId, email: "adm001@greenvalley.ac.ke", passwordHash: studentPassword, role: "STUDENT", fullName: "John Mwangi Kamau" },
  });

  const student2User = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.tenantId, email: "adm002@greenvalley.ac.ke" } },
    update: { passwordHash: studentPassword },
    create: { tenantId: tenant.tenantId, email: "adm002@greenvalley.ac.ke", passwordHash: studentPassword, role: "STUDENT", fullName: "Faith Akinyi Odhiambo" },
  });

  const student3User = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.tenantId, email: "adm003@greenvalley.ac.ke" } },
    update: { passwordHash: studentPassword },
    create: { tenantId: tenant.tenantId, email: "adm003@greenvalley.ac.ke", passwordHash: studentPassword, role: "STUDENT", fullName: "Brian Kipchoge Rono" },
  });

  const parentUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.tenantId, email: "parent1@greenvalley.ac.ke" } },
    update: { passwordHash: parentPassword },
    create: { tenantId: tenant.tenantId, email: "parent1@greenvalley.ac.ke", phone: "+254711101001", passwordHash: parentPassword, role: "PARENT", fullName: "James Kamau Mwangi" },
  });

  const parentUser2 = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.tenantId, email: "parent2@greenvalley.ac.ke" } },
    update: { passwordHash: parentPassword },
    create: { tenantId: tenant.tenantId, email: "parent2@greenvalley.ac.ke", phone: "+254711101002", passwordHash: parentPassword, role: "PARENT", fullName: "Grace Akinyi" },
  });

  // ── Dashboard & Feature Assignments ──────────────────────────────────────
  for (const d of dashboardSeeds) {
    const dashboardId = dashboards[d.dashboardKey];
    await prisma.tenantDashboardAssignment.upsert({
      where: { tenantId_dashboardId: { tenantId: tenant.tenantId, dashboardId } },
      update: {},
      create: { tenantId: tenant.tenantId, dashboardId, assignedBy: hq.platformUserId },
    });
  }

  for (const [featureKey, , dashboardKey] of featureSeeds) {
    const dashboardId = dashboards[dashboardKey];
    await prisma.tenantFeatureAssignment.upsert({
      where: { tenantId_dashboardId_featureId: { tenantId: tenant.tenantId, dashboardId, featureId: features[featureKey] } },
      update: {},
      create: { tenantId: tenant.tenantId, dashboardId, featureId: features[featureKey], assignedBy: hq.platformUserId },
    });
  }

  // ── Academic Year & Terms ─────────────────────────────────────────────────
  let year = await prisma.academicYear.findFirst({
    where: { tenantId: tenant.tenantId, yearLabel: "2025" },
  });
  if (!year) {
    year = await prisma.academicYear.create({
      data: {
        tenantId: tenant.tenantId, yearLabel: "2025",
        startDate: new Date("2025-01-08"), endDate: new Date("2025-11-29"), isCurrent: true,
      },
    });
  }

  // Use findFirst + create with a guard to avoid duplicate terms
  let term = await prisma.term.findFirst({
    where: { tenantId: tenant.tenantId, yearId: year.yearId, termNumber: 2 },
  });
  if (!term) {
    term = await prisma.term.create({
      data: {
        tenantId: tenant.tenantId, yearId: year.yearId, termNumber: 2,
        termName: "Term 2", startDate: new Date("2025-05-06"), endDate: new Date("2025-08-09"), isCurrent: true,
      },
    });
  }

  // Term 1 (historical)
  let term1 = await prisma.term.findFirst({
    where: { tenantId: tenant.tenantId, yearId: year.yearId, termNumber: 1 },
  });
  if (!term1) {
    term1 = await prisma.term.create({
      data: {
        tenantId: tenant.tenantId, yearId: year.yearId, termNumber: 1,
        termName: "Term 1", startDate: new Date("2025-01-08"), endDate: new Date("2025-04-04"), isCurrent: false,
      },
    });
  }

  // ── Education Tiers ───────────────────────────────────────────────────────
  const findOrCreateTier = async (tierKey: string, tierName: string, gradeFrom: string, gradeTo: string) => {
    let tier = await prisma.educationTier.findFirst({
      where: { tenantId: tenant.tenantId, tierKey },
    });
    if (!tier) {
      tier = await prisma.educationTier.create({
        data: { tenantId: tenant.tenantId, tierKey, tierName, gradeFrom, gradeTo },
      });
    }
    return tier;
  };

  const primaryTier = await findOrCreateTier("PRIMARY", "Primary School", "Grade 1", "Grade 6");
  const jssTier = await findOrCreateTier("JSS", "Junior Secondary", "Grade 7", "Grade 9");
  const sssTier = await findOrCreateTier("SSS", "Senior Secondary", "Grade 10", "Grade 12");

  // ── Classes ───────────────────────────────────────────────────────────────
  const findOrCreateClass = async (grade: string, stream: string, tierId: string) => {
    let cls = await prisma.class.findFirst({
      where: { tenantId: tenant.tenantId, grade, stream, yearId: year.yearId },
    });
    if (!cls) {
      cls = await prisma.class.create({
        data: {
          tenantId: tenant.tenantId, tierId, yearId: year.yearId,
          grade, stream, className: `${grade} ${stream}`, capacity: 40,
        },
      });
    }
    return cls;
  };

  const class4  = await findOrCreateClass("Grade 4",  "East",  primaryTier.tierId);
  const class6  = await findOrCreateClass("Grade 6",  "West",  primaryTier.tierId);
  const class7  = await findOrCreateClass("Grade 7",  "Red",   jssTier.tierId);
  const class8  = await findOrCreateClass("Grade 8",  "Blue",  jssTier.tierId);
  const class10 = await findOrCreateClass("Grade 10", "A",     sssTier.tierId);
  const class11 = await findOrCreateClass("Grade 11", "B",     sssTier.tierId);

  // ── Subjects ──────────────────────────────────────────────────────────────
  const subjectData = [
    { tenantId: tenant.tenantId, tierId: primaryTier.tierId, subjectName: "Mathematics",          subjectCode: "MATH-P",  cbcLearningArea: "Mathematical Activities",     isCore: true  },
    { tenantId: tenant.tenantId, tierId: primaryTier.tierId, subjectName: "English Language",     subjectCode: "ENG-P",   cbcLearningArea: "Language Activities",          isCore: true  },
    { tenantId: tenant.tenantId, tierId: primaryTier.tierId, subjectName: "Kiswahili",             subjectCode: "KIS-P",   cbcLearningArea: "Kiswahili Language Activities", isCore: true  },
    { tenantId: tenant.tenantId, tierId: primaryTier.tierId, subjectName: "Science & Technology", subjectCode: "SCI-P",   cbcLearningArea: "Environmental Activities",     isCore: true  },
    { tenantId: tenant.tenantId, tierId: jssTier.tierId,     subjectName: "Mathematics",          subjectCode: "MATH-J",  cbcLearningArea: "Mathematics",                  isCore: true  },
    { tenantId: tenant.tenantId, tierId: jssTier.tierId,     subjectName: "English",              subjectCode: "ENG-J",   cbcLearningArea: "English",                      isCore: true  },
    { tenantId: tenant.tenantId, tierId: jssTier.tierId,     subjectName: "Kiswahili",             subjectCode: "KIS-J",   cbcLearningArea: "Kiswahili",                    isCore: true  },
    { tenantId: tenant.tenantId, tierId: jssTier.tierId,     subjectName: "Integrated Science",   subjectCode: "SCI-J",   cbcLearningArea: "Integrated Science",           isCore: true  },
    { tenantId: tenant.tenantId, tierId: jssTier.tierId,     subjectName: "Social Studies",        subjectCode: "SS-J",    cbcLearningArea: "Social Studies",               isCore: true  },
    { tenantId: tenant.tenantId, tierId: sssTier.tierId,     subjectName: "Mathematics",          subjectCode: "MATH-S",  cbcLearningArea: "Mathematics",                  isCore: true  },
    { tenantId: tenant.tenantId, tierId: sssTier.tierId,     subjectName: "English",              subjectCode: "ENG-S",   cbcLearningArea: "English",                      isCore: true  },
    { tenantId: tenant.tenantId, tierId: sssTier.tierId,     subjectName: "Biology",              subjectCode: "BIO-S",   cbcLearningArea: "Biology",                      isCore: false },
    { tenantId: tenant.tenantId, tierId: sssTier.tierId,     subjectName: "Chemistry",            subjectCode: "CHEM-S",  cbcLearningArea: "Chemistry",                    isCore: false },
    { tenantId: tenant.tenantId, tierId: sssTier.tierId,     subjectName: "Physics",              subjectCode: "PHY-S",   cbcLearningArea: "Physics",                      isCore: false },
  ];

  const subjectMap: Record<string, string> = {};
  for (const sd of subjectData) {
    let subj = await prisma.subject.findFirst({ where: { tenantId: tenant.tenantId, subjectCode: sd.subjectCode } });
    if (!subj) subj = await prisma.subject.create({ data: sd });
    subjectMap[sd.subjectCode] = subj.subjectId;
  }

  // ── Staff ────────────────────────────────────────────────────────────────
  const findOrCreateStaff = async (userId: string, data: {
    tscNumber: string; fullName: string; nationalId: string; staffType: string;
    specialization?: string; employmentType: string; joinedDate: Date; phone: string; email: string;
  }) => {
    let staff = await prisma.staff.findFirst({ where: { tenantId: tenant.tenantId, userId } });
    if (!staff) {
      staff = await prisma.staff.create({
        data: {
          tenantId: tenant.tenantId, userId,
          tscNumber: data.tscNumber, fullName: data.fullName, nationalId: data.nationalId,
          staffType: data.staffType as "TEACHING" | "NON_TEACHING" | "SUPPORT",
          specialization: data.specialization, employmentType: data.employmentType as "PERMANENT" | "CONTRACT" | "INTERN",
          joinedDate: data.joinedDate, phone: data.phone, email: data.email,
        },
      });
    }
    return staff;
  };

  const staffTeacher = await findOrCreateStaff(teacherUser.userId, {
    tscNumber: "T001", fullName: "Alice Wanjiku", nationalId: "30011001",
    staffType: "TEACHING", specialization: "Mathematics",
    employmentType: "PERMANENT", joinedDate: new Date("2019-03-01"),
    phone: "+254711001001", email: "teacher1@greenvalley.ac.ke",
  });
  const staffTeacher2 = await findOrCreateStaff(teacherUser2.userId, {
    tscNumber: "T002", fullName: "David Ochieng", nationalId: "30011002",
    staffType: "TEACHING", specialization: "Sciences",
    employmentType: "PERMANENT", joinedDate: new Date("2020-06-15"),
    phone: "+254711001002", email: "teacher2@greenvalley.ac.ke",
  });
  const staffFinance = await findOrCreateStaff(financeUser.userId, {
    tscNumber: "F001", fullName: "Peter Mwangi", nationalId: "30011009",
    staffType: "SUPPORT", specialization: "Finance",
    employmentType: "PERMANENT", joinedDate: new Date("2020-01-15"),
    phone: "+254700111003", email: "finance@greenvalley.ac.ke",
  });

  // ── Class Teacher Assignments ─────────────────────────────────────────────
  const ctaData = [
    { classId: class7.classId,  staffId: staffTeacher.staffId,  assignmentType: "FORM_TEACHER",    subjectId: null,                          yearId: year.yearId },
    { classId: class7.classId,  staffId: staffTeacher.staffId,  assignmentType: "SUBJECT_TEACHER", subjectId: subjectMap["MATH-J"],           yearId: year.yearId },
    { classId: class7.classId,  staffId: staffTeacher2.staffId, assignmentType: "SUBJECT_TEACHER", subjectId: subjectMap["SCI-J"],            yearId: year.yearId },
    { classId: class8.classId,  staffId: staffTeacher.staffId,  assignmentType: "SUBJECT_TEACHER", subjectId: subjectMap["MATH-J"],           yearId: year.yearId },
    { classId: class10.classId, staffId: staffTeacher2.staffId, assignmentType: "FORM_TEACHER",    subjectId: null,                          yearId: year.yearId },
    { classId: class10.classId, staffId: staffTeacher2.staffId, assignmentType: "SUBJECT_TEACHER", subjectId: subjectMap["BIO-S"],            yearId: year.yearId },
    { classId: class4.classId,  staffId: staffTeacher.staffId,  assignmentType: "SUBJECT_TEACHER", subjectId: subjectMap["MATH-P"],           yearId: year.yearId },
  ];
  for (const cta of ctaData) {
    const exists = await prisma.classTeacherAssignment.findFirst({
      where: { tenantId: tenant.tenantId, classId: cta.classId, staffId: cta.staffId, assignmentType: cta.assignmentType, subjectId: cta.subjectId ?? undefined },
    });
    if (!exists) {
      await prisma.classTeacherAssignment.create({
        data: { tenantId: tenant.tenantId, ...cta, isActive: true },
      });
    }
  }

  // ── Students ─────────────────────────────────────────────────────────────
  const findOrCreateStudent = async (userId: string, data: {
    nemisNumber: string; fullName: string; dateOfBirth: Date; gender: string;
    classId: string; admissionNumber: string; currentGrade: string; tierId: string;
  }) => {
    let student = await prisma.student.findFirst({ where: { tenantId: tenant.tenantId, userId } });
    if (!student) {
      student = await prisma.student.create({
        data: {
          tenantId: tenant.tenantId, userId,
          nemisNumber: data.nemisNumber, fullName: data.fullName,
          dateOfBirth: data.dateOfBirth, gender: data.gender as "MALE" | "FEMALE",
          classId: data.classId, admissionNumber: data.admissionNumber,
          admittedDate: new Date("2023-01-09"), currentGrade: data.currentGrade,
          tierId: data.tierId, promotionStatus: "ACTIVE",
        },
      });
    }
    return student;
  };

  const student  = await findOrCreateStudent(studentUser.userId,  { nemisNumber: "NEMIS2026001", fullName: "John Mwangi Kamau",    dateOfBirth: new Date("2013-04-12"), gender: "MALE",   classId: class7.classId, admissionNumber: "ADM001", currentGrade: "Grade 7", tierId: jssTier.tierId });
  const student2 = await findOrCreateStudent(student2User.userId, { nemisNumber: "NEMIS2026002", fullName: "Faith Akinyi Odhiambo",dateOfBirth: new Date("2013-07-22"), gender: "FEMALE", classId: class7.classId, admissionNumber: "ADM002", currentGrade: "Grade 7", tierId: jssTier.tierId });
  const student3 = await findOrCreateStudent(student3User.userId, { nemisNumber: "NEMIS2026003", fullName: "Brian Kipchoge Rono",   dateOfBirth: new Date("2014-02-05"), gender: "MALE",   classId: class4.classId, admissionNumber: "ADM003", currentGrade: "Grade 4", tierId: primaryTier.tierId });

  // ── Parents ───────────────────────────────────────────────────────────────
  const findOrCreateParent = async (userId: string, data: {
    fullName: string; nationalId: string; phonePrimary: string; relationship: string;
  }) => {
    let p = await prisma.parent.findFirst({ where: { tenantId: tenant.tenantId, userId } });
    if (!p) {
      p = await prisma.parent.create({
        data: {
          tenantId: tenant.tenantId, userId,
          fullName: data.fullName, nationalId: data.nationalId,
          phonePrimary: data.phonePrimary, relationship: data.relationship as "FATHER" | "MOTHER" | "GUARDIAN",
        },
      });
    }
    return p;
  };

  const parent  = await findOrCreateParent(parentUser.userId,  { fullName: "James Kamau Mwangi", nationalId: "12345001", phonePrimary: "+254711101001", relationship: "FATHER" });
  const parent2 = await findOrCreateParent(parentUser2.userId, { fullName: "Grace Akinyi",        nationalId: "12345002", phonePrimary: "+254711101002", relationship: "MOTHER" });

  // ── Parent-Student Links ──────────────────────────────────────────────────
  const linkData = [
    { parentId: parent.parentId,  studentId: student.studentId,  isPrimaryContact: true  },
    { parentId: parent.parentId,  studentId: student2.studentId, isPrimaryContact: false }, // James sees both ADM001 and ADM002
    { parentId: parent2.parentId, studentId: student3.studentId, isPrimaryContact: true  }, // Grace only sees ADM003
  ];
  for (const link of linkData) {
    const exists = await prisma.parentStudentLink.findFirst({
      where: { tenantId: tenant.tenantId, parentId: link.parentId, studentId: link.studentId },
    });
    if (!exists) {
      await prisma.parentStudentLink.create({
        data: { tenantId: tenant.tenantId, ...link, canViewResults: true, canViewFees: true, canViewAttendance: true },
      });
    }
  }

  // ── Fee Structures ────────────────────────────────────────────────────────
  const feeStructureData = [
    { tierId: jssTier.tierId,     feeType: "Tuition Fee",      amountKes: 15000, isMandatory: true,  dueDate: new Date("2025-06-30") },
    { tierId: jssTier.tierId,     feeType: "Activity Fee",     amountKes: 2500,  isMandatory: false, dueDate: new Date("2025-06-30") },
    { tierId: jssTier.tierId,     feeType: "Lunch Fee",        amountKes: 8000,  isMandatory: false, dueDate: new Date("2025-06-30") },
    { tierId: primaryTier.tierId, feeType: "Tuition Fee",      amountKes: 12000, isMandatory: true,  dueDate: new Date("2025-06-30") },
    { tierId: primaryTier.tierId, feeType: "Activity Fee",     amountKes: 1800,  isMandatory: false, dueDate: new Date("2025-06-30") },
    { tierId: sssTier.tierId,     feeType: "Tuition Fee",      amountKes: 22000, isMandatory: true,  dueDate: new Date("2025-06-30") },
    { tierId: sssTier.tierId,     feeType: "Development Levy", amountKes: 5000,  isMandatory: true,  dueDate: new Date("2025-06-30") },
  ];

  const feeStructures: Record<string, string> = {};
  for (const fsd of feeStructureData) {
    let fs = await prisma.feeStructure.findFirst({
      where: { tenantId: tenant.tenantId, tierId: fsd.tierId, feeType: fsd.feeType, yearId: year.yearId },
    });
    if (!fs) {
      fs = await prisma.feeStructure.create({
        data: { tenantId: tenant.tenantId, yearId: year.yearId, termId: term.termId, ...fsd },
      });
    }
    feeStructures[`${fsd.tierId}-${fsd.feeType}`] = fs.feeStructureId;
  }

  // ── Fee Payments ──────────────────────────────────────────────────────────
  const jssTuitionId = feeStructures[`${jssTier.tierId}-Tuition Fee`];
  const jssActivityId = feeStructures[`${jssTier.tierId}-Activity Fee`];
  const primaryTuitionId = feeStructures[`${primaryTier.tierId}-Tuition Fee`];

  const paymentData = [
    { studentId: student.studentId,  feeStructureId: jssTuitionId,     amountPaid: 10000, paymentMethod: "MPESA",  mpesaCode: "QAB123456", receiptNumber: "RCP000001" },
    { studentId: student.studentId,  feeStructureId: jssActivityId,    amountPaid: 2500,  paymentMethod: "MPESA",  mpesaCode: "QAB123457", receiptNumber: "RCP000002" },
    { studentId: student2.studentId, feeStructureId: jssTuitionId,     amountPaid: 15000, paymentMethod: "CASH",   mpesaCode: null,         receiptNumber: "RCP000003" },
    { studentId: student3.studentId, feeStructureId: primaryTuitionId, amountPaid: 6000,  paymentMethod: "BANK",   mpesaCode: null,         receiptNumber: "RCP000004" },
    { studentId: student.studentId,  feeStructureId: jssTuitionId,     amountPaid: 5000,  paymentMethod: "MPESA",  mpesaCode: "QAB123458", receiptNumber: "RCP000005" },
  ];

  for (const pd of paymentData) {
    const exists = await prisma.feePayment.findFirst({
      where: { tenantId: tenant.tenantId, receiptNumber: pd.receiptNumber },
    });
    if (!exists) {
      await prisma.feePayment.create({
        data: {
          tenantId: tenant.tenantId, ...pd,
          recordedBy: financeUser.userId,
          notes: `Payment via ${pd.paymentMethod}`,
        },
      });
    }
  }

  // ── Marks ────────────────────────────────────────────────────────────────
  const markData = [
    { studentId: student.studentId,  subjectId: subjectMap["MATH-J"], classId: class7.classId, termId: term.termId,  rawScore: 84, cbcGrade: "ME", assessmentType: "FORMATIVE" },
    { studentId: student.studentId,  subjectId: subjectMap["ENG-J"],  classId: class7.classId, termId: term.termId,  rawScore: 76, cbcGrade: "ME", assessmentType: "FORMATIVE" },
    { studentId: student.studentId,  subjectId: subjectMap["SCI-J"],  classId: class7.classId, termId: term.termId,  rawScore: 91, cbcGrade: "EE", assessmentType: "FORMATIVE" },
    { studentId: student.studentId,  subjectId: subjectMap["KIS-J"],  classId: class7.classId, termId: term.termId,  rawScore: 68, cbcGrade: "AE", assessmentType: "SUMMATIVE" },
    { studentId: student.studentId,  subjectId: subjectMap["MATH-J"], classId: class7.classId, termId: term1.termId, rawScore: 79, cbcGrade: "ME", assessmentType: "SUMMATIVE" },
    { studentId: student2.studentId, subjectId: subjectMap["MATH-J"], classId: class7.classId, termId: term.termId,  rawScore: 92, cbcGrade: "EE", assessmentType: "FORMATIVE" },
    { studentId: student2.studentId, subjectId: subjectMap["ENG-J"],  classId: class7.classId, termId: term.termId,  rawScore: 88, cbcGrade: "ME", assessmentType: "FORMATIVE" },
    { studentId: student3.studentId, subjectId: subjectMap["MATH-P"], classId: class4.classId, termId: term.termId,  rawScore: 72, cbcGrade: "AE", assessmentType: "FORMATIVE" },
    { studentId: student3.studentId, subjectId: subjectMap["ENG-P"],  classId: class4.classId, termId: term.termId,  rawScore: 65, cbcGrade: "AE", assessmentType: "FORMATIVE" },
  ];

  for (const md of markData) {
    const exists = await prisma.mark.findFirst({
      where: { tenantId: tenant.tenantId, studentId: md.studentId, subjectId: md.subjectId, termId: md.termId, assessmentType: md.assessmentType },
    });
    if (!exists) {
      await prisma.mark.create({
        data: { tenantId: tenant.tenantId, ...md, maxScore: 100, enteredBy: teacherUser.userId, isPublished: true, publishedAt: new Date() },
      });
    }
  }

  // ── Attendance ────────────────────────────────────────────────────────────
  const today = new Date();
  const attendanceDates = Array.from({ length: 10 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - i - 1);
    // Skip weekends
    if (d.getDay() === 0 || d.getDay() === 6) return null;
    return d;
  }).filter(Boolean) as Date[];

  for (const date of attendanceDates) {
    for (const stu of [student, student2, student3]) {
      const classId = stu.studentId === student3.studentId ? class4.classId : class7.classId;
      const exists = await prisma.attendance.findFirst({
        where: { tenantId: tenant.tenantId, studentId: stu.studentId, attendanceDate: date },
      });
      if (!exists) {
        const rand = Math.random();
        await prisma.attendance.create({
          data: {
            tenantId: tenant.tenantId, studentId: stu.studentId, classId, termId: term.termId,
            attendanceDate: date, status: rand > 0.15 ? "PRESENT" : "ABSENT",
            markedBy: teacherUser.userId, notes: null,
          },
        });
      }
    }
  }

  // ── CBC Competencies ──────────────────────────────────────────────────────
  const competencies = [
    { studentId: student.studentId,  competencyArea: "Communication & Collaboration", level: "ME" },
    { studentId: student.studentId,  competencyArea: "Critical Thinking & Problem Solving", level: "ME" },
    { studentId: student.studentId,  competencyArea: "Creativity & Imagination", level: "EE" },
    { studentId: student2.studentId, competencyArea: "Communication & Collaboration", level: "EE" },
    { studentId: student2.studentId, competencyArea: "Digital Literacy", level: "ME" },
    { studentId: student3.studentId, competencyArea: "Communication & Collaboration", level: "AE" },
  ];

  for (const comp of competencies) {
    const exists = await prisma.cbcCompetency.findFirst({
      where: { tenantId: tenant.tenantId, studentId: comp.studentId, termId: term.termId, competencyArea: comp.competencyArea },
    });
    if (!exists) {
      await prisma.cbcCompetency.create({
        data: { tenantId: tenant.tenantId, termId: term.termId, ...comp, level: comp.level as "EE" | "ME" | "AE" | "BE", assessedBy: teacherUser.userId },
      });
    }
  }

  // ── Student Portfolios ────────────────────────────────────────────────────
  const portfolioData = [
    { studentId: student.studentId,  subjectId: subjectMap["MATH-J"], title: "Water Purification Model",       description: "CBC portfolio evidence: science project" },
    { studentId: student.studentId,  subjectId: subjectMap["ENG-J"],  title: "My Nairobi Story Essay",         description: "Creative writing – Language & Communication" },
    { studentId: student2.studentId, subjectId: subjectMap["MATH-J"], title: "Data Analysis Chart Project",    description: "Statistics CBC evidence" },
    { studentId: student3.studentId, subjectId: subjectMap["MATH-P"], title: "Counting Shapes Activity",      description: "Primary Math CBC evidence" },
  ];

  for (const pd of portfolioData) {
    const exists = await prisma.studentPortfolio.findFirst({
      where: { tenantId: tenant.tenantId, studentId: pd.studentId, title: pd.title },
    });
    if (!exists) {
      await prisma.studentPortfolio.create({
        data: {
          tenantId: tenant.tenantId, ...pd, termId: term.termId,
          fileType: "document", uploadedBy: teacherUser.userId, isVisibleParent: true,
        },
      });
    }
  }

  // ── Reports ───────────────────────────────────────────────────────────────
  const reportData = [
    { studentId: student.studentId,  classId: class7.classId, reportType: "TERM_REPORT" },
    { studentId: student2.studentId, classId: class7.classId, reportType: "TERM_REPORT" },
  ];

  for (const rd of reportData) {
    const exists = await prisma.report.findFirst({
      where: { tenantId: tenant.tenantId, studentId: rd.studentId, termId: term.termId },
    });
    if (!exists) {
      await prisma.report.create({
        data: {
          tenantId: tenant.tenantId, ...rd, termId: term.termId,
          reportType: rd.reportType as "TERM_REPORT",
          generatedBy: teacherUser.userId, approvedBy: principalUser.userId,
          approvedAt: new Date(), isPublished: true, publishedAt: new Date(),
        },
      });
    }
  }

  // ── Assignments ───────────────────────────────────────────────────────────
  const assignmentData = [
    { title: "Mathematics Problem Set 1", classId: class7.classId, subjectId: subjectMap["MATH-J"], dueDate: new Date(Date.now() + 7 * 86400_000),  maxScore: 30 },
    { title: "English Essay: My Community",classId: class7.classId, subjectId: subjectMap["ENG-J"],  dueDate: new Date(Date.now() + 5 * 86400_000),  maxScore: 20 },
    { title: "Science Experiment Report",  classId: class7.classId, subjectId: subjectMap["SCI-J"],  dueDate: new Date(Date.now() + 10 * 86400_000), maxScore: 25 },
    { title: "Primary Math Workbook",      classId: class4.classId, subjectId: subjectMap["MATH-P"], dueDate: new Date(Date.now() + 3 * 86400_000),  maxScore: 20 },
  ];

  for (const ad of assignmentData) {
    const exists = await prisma.assignment.findFirst({
      where: { tenantId: tenant.tenantId, title: ad.title },
    });
    if (!exists) {
      await prisma.assignment.create({
        data: {
          tenantId: tenant.tenantId, ...ad, termId: term.termId,
          description: `${ad.title} – assigned by teacher`,
          createdBy: teacherUser.userId,
          isPublished: true,
        },
      });
    }
  }

  // ── Expenses ─────────────────────────────────────────────────────────────
  const expenseData = [
    { category: "Utilities",  description: "Electricity bill – May", amountKes: 18500, status: "APPROVED" },
    { category: "Supplies",   description: "Stationery & textbooks", amountKes: 42000, status: "APPROVED" },
    { category: "Maintenance",description: "Roof repair – Block B",  amountKes: 75000, status: "PENDING"  },
    { category: "Utilities",  description: "Water bill – May",       amountKes: 8200,  status: "APPROVED" },
    { category: "Events",     description: "Sports day equipment",    amountKes: 15000, status: "PENDING"  },
  ];

  for (const ed of expenseData) {
    const exists = await prisma.expense.findFirst({
      where: { tenantId: tenant.tenantId, description: ed.description },
    });
    if (!exists) {
      await prisma.expense.create({
        data: {
          tenantId: tenant.tenantId, yearId: year.yearId, ...ed,
          amountKes: ed.amountKes, expenseDate: new Date(),
          recordedBy: financeUser.userId,
          approvedBy: ed.status === "APPROVED" ? principalUser.userId : null,
          status: ed.status as "PENDING" | "APPROVED" | "REJECTED",
        },
      });
    }
  }

  // ── Payroll ───────────────────────────────────────────────────────────────
  const payrollData = [
    { staffId: staffTeacher.staffId,  month: 4, grossSalary: 68000, deductions: 8200,  netSalary: 59800, paymentStatus: "PAID"    },
    { staffId: staffTeacher.staffId,  month: 5, grossSalary: 68000, deductions: 8200,  netSalary: 59800, paymentStatus: "PENDING" },
    { staffId: staffTeacher2.staffId, month: 4, grossSalary: 62000, deductions: 7500,  netSalary: 54500, paymentStatus: "PAID"    },
    { staffId: staffTeacher2.staffId, month: 5, grossSalary: 62000, deductions: 7500,  netSalary: 54500, paymentStatus: "PENDING" },
    { staffId: staffFinance.staffId,  month: 4, grossSalary: 55000, deductions: 6200,  netSalary: 48800, paymentStatus: "PAID"    },
    { staffId: staffFinance.staffId,  month: 5, grossSalary: 55000, deductions: 6200,  netSalary: 48800, paymentStatus: "PENDING" },
  ];

  for (const pd of payrollData) {
    const exists = await prisma.payroll.findFirst({
      where: { tenantId: tenant.tenantId, staffId: pd.staffId, yearId: year.yearId, month: pd.month },
    });
    if (!exists) {
      await prisma.payroll.create({
        data: {
          tenantId: tenant.tenantId, yearId: year.yearId, ...pd,
          paymentStatus: pd.paymentStatus as "PENDING" | "PAID",
          paidAt: pd.paymentStatus === "PAID" ? new Date() : null,
          processedBy: financeUser.userId,
        },
      });
    }
  }

  // ── Timetable ─────────────────────────────────────────────────────────────
  const timetableData = [
    { classId: class7.classId, subjectId: subjectMap["MATH-J"], staffId: staffTeacher.staffId,  dayOfWeek: 1, startTime: "08:00", endTime: "08:40", room: "Room 3" },
    { classId: class7.classId, subjectId: subjectMap["ENG-J"],  staffId: staffTeacher.staffId,  dayOfWeek: 1, startTime: "08:40", endTime: "09:20", room: "Room 3" },
    { classId: class7.classId, subjectId: subjectMap["SCI-J"],  staffId: staffTeacher2.staffId, dayOfWeek: 2, startTime: "08:00", endTime: "09:00", room: "Lab 1" },
    { classId: class7.classId, subjectId: subjectMap["MATH-J"], staffId: staffTeacher.staffId,  dayOfWeek: 3, startTime: "10:00", endTime: "10:40", room: "Room 3" },
    { classId: class4.classId, subjectId: subjectMap["MATH-P"], staffId: staffTeacher.staffId,  dayOfWeek: 1, startTime: "10:00", endTime: "10:40", room: "Room 1" },
    { classId: class4.classId, subjectId: subjectMap["ENG-P"],  staffId: staffTeacher.staffId,  dayOfWeek: 2, startTime: "08:00", endTime: "08:40", room: "Room 1" },
  ];

  for (const td of timetableData) {
    const exists = await prisma.timetableEntry.findFirst({
      where: { tenantId: tenant.tenantId, classId: td.classId, subjectId: td.subjectId, dayOfWeek: td.dayOfWeek, startTime: td.startTime, yearId: year.yearId },
    });
    if (!exists) {
      await prisma.timetableEntry.create({
        data: { tenantId: tenant.tenantId, yearId: year.yearId, termId: term.termId, ...td, createdBy: adminUser.userId },
      });
    }
  }

  // ── Message Threads ───────────────────────────────────────────────────────
  const existingThread = await prisma.messageThread.findFirst({
    where: { tenantId: tenant.tenantId, subject: "Term 2 Progress Update" },
  });
  if (!existingThread) {
    await prisma.messageThread.create({
      data: {
        tenantId: tenant.tenantId, subject: "Term 2 Progress Update", createdBy: teacherUser.userId,
        participants: {
          create: [
            { tenantId: tenant.tenantId, userId: teacherUser.userId,  roleLabel: "SENDER" },
            { tenantId: tenant.tenantId, userId: parentUser.userId,   roleLabel: "PARENT" },
          ],
        },
        messages: {
          create: {
            tenantId: tenant.tenantId, senderId: teacherUser.userId,
            body: "Hello parent, please review the latest report and portfolio items for Term 2.",
          },
        },
      },
    });
  }

  // ── Notification Templates ────────────────────────────────────────────────
  await prisma.notificationTemplate.createMany({
    data: [
      { templateKey: "REPORT_READY",     titleTemplate: "Report Ready",         bodyTemplate: "Your child's term report has been published.",                     channel: "IN_APP", priority: "HIGH"   },
      { templateKey: "ATTENDANCE_ABSENT",titleTemplate: "Attendance Alert",      bodyTemplate: "Your child {{name}} was marked absent today.",                     channel: "SMS",    priority: "HIGH"   },
      { templateKey: "FEE_RECEIPT",      titleTemplate: "Fee Payment Received",  bodyTemplate: "We received KES {{amount}} and generated receipt {{receipt}}.",    channel: "SMS",    priority: "HIGH"   },
      { templateKey: "FEE_REMINDER",     titleTemplate: "Fee Balance Reminder",  bodyTemplate: "You have an outstanding balance of KES {{balance}} due {{date}}.", channel: "EMAIL",  priority: "MEDIUM" },
      { templateKey: "NEW_ASSIGNMENT",   titleTemplate: "New Assignment",        bodyTemplate: "{{teacher}} has posted a new assignment: {{title}}.",              channel: "IN_APP", priority: "MEDIUM" },
    ],
    skipDuplicates: true,
  });

  // ── Notifications ─────────────────────────────────────────────────────────
  const notifications = [
    { userId: parentUser.userId,   title: "Report Ready",          message: "John's term 2 report has been published and is ready for review.", type: "REPORT",  priority: "HIGH",   channel: "IN_APP" },
    { userId: parentUser.userId,   title: "Fee Balance Reminder",  message: "Outstanding balance of KES 5,000 for John Mwangi. Due 30 June 2025.", type: "FINANCE", priority: "MEDIUM", channel: "IN_APP" },
    { userId: teacherUser.userId,  title: "Assignment Due",        message: "Mathematics Problem Set 1 is due in 7 days.", type: "ASSIGNMENT", priority: "LOW",   channel: "IN_APP" },
    { userId: adminUser.userId,    title: "Payroll Pending",       message: "3 payroll records are awaiting processing for May 2025.", type: "PAYROLL", priority: "MEDIUM", channel: "IN_APP" },
    { userId: financeUser.userId,  title: "M-Pesa Payment",        message: "Payment QAB123456 of KES 10,000 confirmed for ADM001.", type: "PAYMENT", priority: "HIGH",   channel: "IN_APP" },
    { userId: principalUser.userId,title: "Report Approval",       message: "2 term reports are awaiting your approval.", type: "REPORT",  priority: "HIGH",   channel: "IN_APP" },
  ];

  for (const n of notifications) {
    const exists = await prisma.notification.findFirst({
      where: { tenantId: tenant.tenantId, recipientUserId: n.userId, title: n.title },
    });
    if (!exists) {
      await prisma.notification.create({
        data: {
          tenantId: tenant.tenantId, recipientUserId: n.userId, ...n,
          priority: n.priority as "LOW" | "MEDIUM" | "HIGH",
          channel: n.channel as "IN_APP",
          isRead: false,
        },
      });
    }
  }

  // ── Chat Rooms ────────────────────────────────────────────────────────────
  const announcementsRoom = await prisma.chatRoom.upsert({
    where: { roomKey: "greenvalley-announcements" },
    update: {},
    create: { tenantId: tenant.tenantId, roomKey: "greenvalley-announcements", roomType: "ANNOUNCEMENT", name: "School Announcements", description: "Official school-wide notices and term updates.", createdByUserId: adminUser.userId },
  });
  const staffRoom = await prisma.chatRoom.upsert({
    where: { roomKey: "greenvalley-staff-general" },
    update: {},
    create: { tenantId: tenant.tenantId, roomKey: "greenvalley-staff-general", roomType: "GROUP", name: "Staff General", description: "Daily staff coordination and quick updates.", createdByUserId: adminUser.userId },
  });
  const classRoom = await prisma.chatRoom.upsert({
    where: { roomKey: "greenvalley-grade7-red" },
    update: {},
    create: { tenantId: tenant.tenantId, roomKey: "greenvalley-grade7-red", roomType: "CLASS", name: "Grade 7 Red", description: "Class discussion for Grade 7 Red.", classId: class7.classId, tierKey: "JSS", createdByUserId: teacherUser.userId },
  });
  const financeRoom = await prisma.chatRoom.upsert({
    where: { roomKey: "greenvalley-finance-help" },
    update: {},
    create: { tenantId: tenant.tenantId, roomKey: "greenvalley-finance-help", roomType: "FINANCE", name: "Finance Help Desk", description: "Fee support and payment verification.", createdByUserId: financeUser.userId },
  });
  const hqSupportRoom = await prisma.chatRoom.upsert({
    where: { roomKey: "greenvalley-hq-support" },
    update: {},
    create: { tenantId: tenant.tenantId, roomKey: "greenvalley-hq-support", roomType: "SUPPORT", name: "HQ Support", description: "Support channel between TechSwiftTrix HQ and Green Valley.", createdByPlatformUserId: hq.platformUserId },
  });

  await prisma.chatRoomMember.createMany({
    data: [
      { tenantId: tenant.tenantId, roomId: announcementsRoom.roomId, userId: adminUser.userId,     roleLabel: "ADMIN"      },
      { tenantId: tenant.tenantId, roomId: announcementsRoom.roomId, userId: principalUser.userId, roleLabel: "PRINCIPAL"  },
      { tenantId: tenant.tenantId, roomId: announcementsRoom.roomId, userId: teacherUser.userId,   roleLabel: "TEACHER"    },
      { tenantId: tenant.tenantId, roomId: announcementsRoom.roomId, userId: studentUser.userId,   roleLabel: "STUDENT"    },
      { tenantId: tenant.tenantId, roomId: announcementsRoom.roomId, userId: parentUser.userId,    roleLabel: "PARENT"     },
      { tenantId: tenant.tenantId, roomId: announcementsRoom.roomId, userId: financeUser.userId,   roleLabel: "FINANCE"    },
      { tenantId: tenant.tenantId, roomId: staffRoom.roomId,         userId: adminUser.userId,     roleLabel: "ADMIN"      },
      { tenantId: tenant.tenantId, roomId: staffRoom.roomId,         userId: principalUser.userId, roleLabel: "PRINCIPAL"  },
      { tenantId: tenant.tenantId, roomId: staffRoom.roomId,         userId: teacherUser.userId,   roleLabel: "TEACHER"    },
      { tenantId: tenant.tenantId, roomId: staffRoom.roomId,         userId: financeUser.userId,   roleLabel: "FINANCE"    },
      { tenantId: tenant.tenantId, roomId: classRoom.roomId,         userId: teacherUser.userId,   roleLabel: "TEACHER"    },
      { tenantId: tenant.tenantId, roomId: classRoom.roomId,         userId: studentUser.userId,   roleLabel: "STUDENT"    },
      { tenantId: tenant.tenantId, roomId: classRoom.roomId,         userId: student2User.userId,  roleLabel: "STUDENT"    },
      { tenantId: tenant.tenantId, roomId: classRoom.roomId,         userId: parentUser.userId,    roleLabel: "PARENT"     },
      { tenantId: tenant.tenantId, roomId: financeRoom.roomId,       userId: financeUser.userId,   roleLabel: "FINANCE"    },
      { tenantId: tenant.tenantId, roomId: financeRoom.roomId,       userId: adminUser.userId,     roleLabel: "ADMIN"      },
      { tenantId: tenant.tenantId, roomId: financeRoom.roomId,       userId: parentUser.userId,    roleLabel: "PARENT"     },
      { tenantId: tenant.tenantId, roomId: hqSupportRoom.roomId,     platformUserId: hq.platformUserId, roleLabel: "SUPER_ADMIN" },
      { tenantId: tenant.tenantId, roomId: hqSupportRoom.roomId,     userId: adminUser.userId,     roleLabel: "ADMIN"      },
      { tenantId: tenant.tenantId, roomId: hqSupportRoom.roomId,     userId: financeUser.userId,   roleLabel: "FINANCE"    },
    ],
    skipDuplicates: true,
  });

  // ── Chat Messages (only if rooms are empty) ───────────────────────────────
  const existingMsg = await prisma.chatMessage.findFirst({
    where: { roomId: { in: [announcementsRoom.roomId, classRoom.roomId, financeRoom.roomId] } },
  });
  if (!existingMsg) {
    await prisma.chatMessage.createMany({
      data: [
        { tenantId: tenant.tenantId, roomId: announcementsRoom.roomId, senderUserId: adminUser.userId,     messageType: "TEXT", content: "Term 2 progress reports are now ready for parent review. All reports are published under the Reports section." },
        { tenantId: tenant.tenantId, roomId: announcementsRoom.roomId, senderUserId: principalUser.userId, messageType: "TEXT", content: "Reminder: All teachers should complete CBC competency entries by end of week." },
        { tenantId: tenant.tenantId, roomId: staffRoom.roomId,         senderUserId: adminUser.userId,     messageType: "TEXT", content: "Staff meeting this Friday at 3:00 PM in the conference room. Attendance mandatory." },
        { tenantId: tenant.tenantId, roomId: staffRoom.roomId,         senderUserId: teacherUser.userId,   messageType: "TEXT", content: "Grade 7 Red marks have been uploaded. Waiting for principal approval." },
        { tenantId: tenant.tenantId, roomId: classRoom.roomId,         senderUserId: teacherUser.userId,   messageType: "TEXT", content: "Good morning Grade 7 Red! Please review the lesson notes before today's Maths session." },
        { tenantId: tenant.tenantId, roomId: classRoom.roomId,         senderUserId: studentUser.userId,   messageType: "TEXT", content: "I have a question about Problem 5 in the assignment, @Alice Wanjiku." },
        { tenantId: tenant.tenantId, roomId: classRoom.roomId,         senderUserId: teacherUser.userId,   messageType: "TEXT", content: "John, I'll explain in class tomorrow. Make sure you review Chapter 4 first." },
        { tenantId: tenant.tenantId, roomId: financeRoom.roomId,       senderUserId: financeUser.userId,   messageType: "TEXT", content: "Fee reconciliation for Term 2 is now complete. All receipts are available in the Finance panel." },
        { tenantId: tenant.tenantId, roomId: financeRoom.roomId,       senderUserId: parentUser.userId,    messageType: "TEXT", content: "I paid KES 10,000 via M-Pesa (QAB123456). Please confirm receipt." },
        { tenantId: tenant.tenantId, roomId: financeRoom.roomId,       senderUserId: financeUser.userId,   messageType: "TEXT", content: "Confirmed ✅ Receipt RCP000001 has been issued for John Mwangi Kamau." },
        { tenantId: tenant.tenantId, roomId: hqSupportRoom.roomId,     senderPlatformUserId: hq.platformUserId, messageType: "TEXT", content: "HQ onboarding check-in: Green Valley analytics, sync health, and billing are all green. 🟢" },
      ],
      skipDuplicates: true,
    });
  }

  // ── M-Pesa Transactions ───────────────────────────────────────────────────
  const mpesaData = [
    { studentId: student.studentId,  phoneNumber: parent.phonePrimary,  amount: 10000, mpesaCode: "QAB123456", status: "CONFIRMED" },
    { studentId: student.studentId,  phoneNumber: parent.phonePrimary,  amount: 2500,  mpesaCode: "QAB123457", status: "CONFIRMED" },
    { studentId: student.studentId,  phoneNumber: parent.phonePrimary,  amount: 5000,  mpesaCode: "QAB123458", status: "CONFIRMED" },
  ];

  for (const md of mpesaData) {
    const exists = await prisma.mpesaTransaction.findFirst({
      where: { tenantId: tenant.tenantId, mpesaCode: md.mpesaCode },
    });
    if (!exists) {
      await prisma.mpesaTransaction.create({
        data: { tenantId: tenant.tenantId, ...md, status: md.status as "CONFIRMED", rawPayload: JSON.stringify({ source: "seed" }) },
      });
    }
  }

  console.log("✅ CBCNexus demo data seeded successfully.");
  console.log("Default logins:");
  console.log("  HQ Admin:   admin@techswifttrix.com / Admin@2025!");
  console.log("  School Admin: admin@greenvalley.ac.ke / School@2025! (subdomain: greenvalley)");
  console.log("  Principal:  principal@greenvalley.ac.ke / Principal@2025! (subdomain: greenvalley)");
  console.log("  Teacher:    teacher1@greenvalley.ac.ke / Teacher@2025! (subdomain: greenvalley)");
  console.log("  Student:    adm001@greenvalley.ac.ke / Student@2025! (subdomain: greenvalley)");
  console.log("  Parent:     parent1@greenvalley.ac.ke / Parent@2025! (subdomain: greenvalley)");
  console.log("  Finance:    finance@greenvalley.ac.ke / Finance@2025! (subdomain: greenvalley)");
}

main().finally(async () => {
  await prisma.$disconnect();
});

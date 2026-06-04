import { prisma } from "../src/prisma.js";
import { hashPassword } from "../src/auth.js";
async function main() {
    const hqPassword = await hashPassword("Admin@2025!");
    const schoolPassword = await hashPassword("School@2025!");
    const principalPassword = await hashPassword("Principal@2025!");
    const teacherPassword = await hashPassword("Teacher@2025!");
    const studentPassword = await hashPassword("Student@2025!");
    const parentPassword = await hashPassword("Parent@2025!");
    const financePassword = await hashPassword("Finance@2025!");
    // Minimal seed for demo-ready API. The full product data is created through the same API routes later.
    const hq = await prisma.platformUser.upsert({
        where: { email: "admin@techswifttrix.com" },
        update: {},
        create: {
            fullName: "TechSwiftTrix Admin",
            email: "admin@techswifttrix.com",
            passwordHash: hqPassword,
            hqRole: "SUPER_ADMIN",
        },
    });
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
    const dashboardSeeds = [
        { dashboardKey: "ADMIN", dashboardName: "School Admin Dashboard", tierScope: "ALL", icon: "🏫", description: "Full school management OS" },
        { dashboardKey: "PRINCIPAL", dashboardName: "Principal Dashboard", tierScope: "ALL", icon: "👨‍💼", description: "Academic oversight and approvals" },
        { dashboardKey: "TEACHER", dashboardName: "Teacher Dashboard", tierScope: "ALL", icon: "👩‍🏫", description: "Classes, grades, attendance" },
        { dashboardKey: "STUDENT", dashboardName: "Student Dashboard", tierScope: "ALL", icon: "🧑‍🎓", description: "Learning and portfolio" },
        { dashboardKey: "PARENT", dashboardName: "Parent Dashboard", tierScope: "ALL", icon: "👨‍👩‍👧", description: "Child monitoring and fees" },
        { dashboardKey: "FINANCE", dashboardName: "Finance Dashboard", tierScope: "ALL", icon: "💰", description: "Fees, payroll, expenses" },
        { dashboardKey: "PRIMARY", dashboardName: "Primary Tier System", tierScope: "PRIMARY", icon: "🔵", description: "Teacher-centric CBC system" },
        { dashboardKey: "JSS", dashboardName: "Junior Secondary System", tierScope: "JSS", icon: "🟢", description: "Hybrid learner system" },
        { dashboardKey: "SSS", dashboardName: "Senior Secondary System", tierScope: "SSS", icon: "🟣", description: "Career pathway engine" },
    ];
    const dashboards = {};
    for (const dashboard of dashboardSeeds) {
        const created = await prisma.platformDashboard.upsert({
            where: { dashboardKey: dashboard.dashboardKey },
            update: {},
            create: {
                dashboardKey: dashboard.dashboardKey,
                dashboardName: dashboard.dashboardName,
                tierScope: dashboard.tierScope,
                icon: dashboard.icon,
                description: dashboard.description,
            },
        });
        dashboards[dashboard.dashboardKey] = created.dashboardId;
    }
    const featureSeeds = [
        ["SCHOOL_OVERVIEW", "School Overview & Analytics", "ADMIN", "ANALYTICS", true],
        ["STUDENT_MGMT", "Student Management", "ADMIN", "ACADEMIC", true],
        ["STAFF_MGMT", "Staff Management", "ADMIN", "HR", true],
        ["CLASS_MGMT", "Class & Stream Management", "ADMIN", "ACADEMIC", true],
        ["MINISTRY_REPORTS", "Ministry & KNEC Reports", "ADMIN", "COMPLIANCE", true],
        ["CBC_COMPLIANCE", "CBC Compliance Monitor", "PRINCIPAL", "COMPLIANCE", true],
        ["SCHOOL_ANALYTICS", "School Performance Analytics", "PRINCIPAL", "ANALYTICS", true],
        ["REPORT_APPROVAL", "Report Card Approval", "PRINCIPAL", "ACADEMIC", true],
        ["GRADE_ENTRY", "CBC Grade Entry", "TEACHER", "ACADEMIC", true],
        ["ATTENDANCE_MARK", "Attendance Marking", "TEACHER", "ACADEMIC", true],
        ["ASSIGNMENTS_MGR", "Assignment Manager", "TEACHER", "ACADEMIC", true],
        ["PORTFOLIO_UPLOAD", "Portfolio Evidence Upload", "TEACHER", "ACADEMIC", true],
        ["LEARNING_MATERIALS", "Learning Materials", "STUDENT", "ACADEMIC", true],
        ["MY_ASSIGNMENTS", "My Assignments", "STUDENT", "ACADEMIC", true],
        ["MY_PORTFOLIO", "CBC Portfolio", "STUDENT", "ACADEMIC", true],
        ["MY_RESULTS", "My Results & Reports", "STUDENT", "ACADEMIC", true],
        ["CHILD_PERFORMANCE", "Child Performance View", "PARENT", "ACADEMIC", true],
        ["FEES_VIEW", "Fee Statements & Payments", "PARENT", "FINANCE", true],
        ["ATTENDANCE_VIEW", "Attendance View", "PARENT", "ACADEMIC", true],
        ["FEE_COLLECTION", "Fee Collection & Receipts", "FINANCE", "FINANCE", true],
        ["EXPENSE_TRACKING", "Expense Tracking", "FINANCE", "FINANCE", true],
        ["PAYROLL_MGMT", "Payroll Management", "FINANCE", "FINANCE", true],
        ["PRIMARY_PORTFOLIO", "Primary CBC Portfolio", "PRIMARY", "ACADEMIC", true],
        ["KPSEA_PREP", "KPSEA Preparation Hub", "PRIMARY", "ACADEMIC", true],
        ["FOUNDATIONAL_SKILLS", "Foundational Skills Tracker", "PRIMARY", "ACADEMIC", true],
        ["JSS_PORTFOLIO", "JSS Student Portfolio", "JSS", "ACADEMIC", true],
        ["COMPETENCY_TRACKER", "CBC Competency Tracker", "JSS", "ACADEMIC", true],
        ["SSS_CAREER_BUILDER", "Career Portfolio Builder", "SSS", "ACADEMIC", true],
        ["PATHWAY_DASHBOARD", "Pathway Dashboard", "SSS", "ACADEMIC", true],
        ["NATIONAL_EXAM_HUB", "National Exam Preparation Hub", "SSS", "ACADEMIC", true],
    ];
    const features = {};
    for (const [featureKey, featureName, dashboardKey, moduleGroup, isCore] of featureSeeds) {
        const created = await prisma.platformFeature.upsert({
            where: { featureKey },
            update: {},
            create: {
                featureKey,
                featureName,
                dashboardId: dashboards[dashboardKey],
                moduleGroup,
                isCore,
            },
        });
        features[featureKey] = created.featureId;
    }
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
    const adminUser = await prisma.user.upsert({
        where: { tenantId_email: { tenantId: tenant.tenantId, email: "admin@greenvalley.ac.ke" } },
        update: {},
        create: {
            tenantId: tenant.tenantId,
            email: "admin@greenvalley.ac.ke",
            phone: "+254700111001",
            passwordHash: schoolPassword,
            role: "ADMIN",
            fullName: "Admin User",
        },
    });
    const principalUser = await prisma.user.upsert({
        where: { tenantId_email: { tenantId: tenant.tenantId, email: "principal@greenvalley.ac.ke" } },
        update: {},
        create: {
            tenantId: tenant.tenantId,
            email: "principal@greenvalley.ac.ke",
            phone: "+254700111002",
            passwordHash: principalPassword,
            role: "PRINCIPAL",
            fullName: "Dr. Margaret Njeri",
        },
    });
    const financeUser = await prisma.user.upsert({
        where: { tenantId_email: { tenantId: tenant.tenantId, email: "finance@greenvalley.ac.ke" } },
        update: {},
        create: {
            tenantId: tenant.tenantId,
            email: "finance@greenvalley.ac.ke",
            phone: "+254700111003",
            passwordHash: financePassword,
            role: "FINANCE",
            fullName: "Peter Mwangi",
        },
    });
    const teacherUser = await prisma.user.upsert({
        where: { tenantId_email: { tenantId: tenant.tenantId, email: "teacher1@greenvalley.ac.ke" } },
        update: {},
        create: {
            tenantId: tenant.tenantId,
            email: "teacher1@greenvalley.ac.ke",
            phone: "+254711001001",
            passwordHash: teacherPassword,
            role: "TEACHER",
            fullName: "Alice Wanjiku",
        },
    });
    const studentUser = await prisma.user.upsert({
        where: { tenantId_email: { tenantId: tenant.tenantId, email: "adm001@greenvalley.ac.ke" } },
        update: {},
        create: {
            tenantId: tenant.tenantId,
            email: "adm001@greenvalley.ac.ke",
            passwordHash: studentPassword,
            role: "STUDENT",
            fullName: "John Mwangi Kamau",
        },
    });
    const parentUser = await prisma.user.upsert({
        where: { tenantId_email: { tenantId: tenant.tenantId, email: "parent1@greenvalley.ac.ke" } },
        update: {},
        create: {
            tenantId: tenant.tenantId,
            email: "parent1@greenvalley.ac.ke",
            phone: "+254711101001",
            passwordHash: parentPassword,
            role: "PARENT",
            fullName: "James Kamau Mwangi",
        },
    });
    for (const dashboard of dashboardSeeds) {
        const dashboardId = dashboards[dashboard.dashboardKey];
        await prisma.tenantDashboardAssignment.upsert({
            where: { tenantId_dashboardId: { tenantId: tenant.tenantId, dashboardId } },
            update: {},
            create: {
                tenantId: tenant.tenantId,
                dashboardId,
                assignedBy: hq.platformUserId,
            },
        });
    }
    for (const [featureKey, , dashboardKey] of featureSeeds) {
        const dashboardId = dashboards[dashboardKey];
        await prisma.tenantFeatureAssignment.upsert({
            where: { tenantId_dashboardId_featureId: { tenantId: tenant.tenantId, dashboardId, featureId: features[featureKey] } },
            update: {},
            create: {
                tenantId: tenant.tenantId,
                dashboardId,
                featureId: features[featureKey],
                assignedBy: hq.platformUserId,
            },
        });
    }
    const year = await prisma.academicYear.create({
        data: {
            tenantId: tenant.tenantId,
            yearLabel: "2025",
            startDate: new Date("2025-01-08"),
            endDate: new Date("2025-11-29"),
            isCurrent: true,
        },
    });
    const term = await prisma.term.create({
        data: {
            tenantId: tenant.tenantId,
            yearId: year.yearId,
            termNumber: 2,
            termName: "Term 2",
            startDate: new Date("2025-05-06"),
            endDate: new Date("2025-08-09"),
            isCurrent: true,
        },
    });
    const primaryTier = await prisma.educationTier.create({
        data: {
            tenantId: tenant.tenantId,
            tierKey: "PRIMARY",
            tierName: "Primary School",
            gradeFrom: "Grade 1",
            gradeTo: "Grade 6",
        },
    });
    const jssTier = await prisma.educationTier.create({
        data: {
            tenantId: tenant.tenantId,
            tierKey: "JSS",
            tierName: "Junior Secondary",
            gradeFrom: "Grade 7",
            gradeTo: "Grade 9",
        },
    });
    const sssTier = await prisma.educationTier.create({
        data: {
            tenantId: tenant.tenantId,
            tierKey: "SSS",
            tierName: "Senior Secondary",
            gradeFrom: "Grade 10",
            gradeTo: "Grade 12",
        },
    });
    const class4 = await prisma.class.create({
        data: {
            tenantId: tenant.tenantId,
            tierId: primaryTier.tierId,
            yearId: year.yearId,
            grade: "Grade 4",
            stream: "East",
            className: "Grade 4 East",
            capacity: 35,
        },
    });
    const class7 = await prisma.class.create({
        data: {
            tenantId: tenant.tenantId,
            tierId: jssTier.tierId,
            yearId: year.yearId,
            grade: "Grade 7",
            stream: "Red",
            className: "Grade 7 Red",
            capacity: 40,
        },
    });
    const class10 = await prisma.class.create({
        data: {
            tenantId: tenant.tenantId,
            tierId: sssTier.tierId,
            yearId: year.yearId,
            grade: "Grade 10",
            stream: "A",
            className: "Grade 10A",
            capacity: 35,
        },
    });
    const mathPrimary = await prisma.subject.create({
        data: { tenantId: tenant.tenantId, tierId: primaryTier.tierId, subjectName: "Mathematics", subjectCode: "MATH", cbcLearningArea: "Mathematical Activities", isCore: true },
    });
    const englishPrimary = await prisma.subject.create({
        data: { tenantId: tenant.tenantId, tierId: primaryTier.tierId, subjectName: "English Language", subjectCode: "ENG", cbcLearningArea: "Language Activities", isCore: true },
    });
    const mathJss = await prisma.subject.create({
        data: { tenantId: tenant.tenantId, tierId: jssTier.tierId, subjectName: "Mathematics", subjectCode: "MATH", cbcLearningArea: "Mathematics", isCore: true },
    });
    const englishJss = await prisma.subject.create({
        data: { tenantId: tenant.tenantId, tierId: jssTier.tierId, subjectName: "English", subjectCode: "ENG", cbcLearningArea: "English", isCore: true },
    });
    const scienceJss = await prisma.subject.create({
        data: { tenantId: tenant.tenantId, tierId: jssTier.tierId, subjectName: "Integrated Science", subjectCode: "SCI", cbcLearningArea: "Integrated Science", isCore: true },
    });
    const mathSss = await prisma.subject.create({
        data: { tenantId: tenant.tenantId, tierId: sssTier.tierId, subjectName: "Mathematics", subjectCode: "MATH", cbcLearningArea: "Mathematics", isCore: true },
    });
    const biologySss = await prisma.subject.create({
        data: { tenantId: tenant.tenantId, tierId: sssTier.tierId, subjectName: "Biology", subjectCode: "BIO", cbcLearningArea: "Biology", isCore: false },
    });
    const chemistrySss = await prisma.subject.create({
        data: { tenantId: tenant.tenantId, tierId: sssTier.tierId, subjectName: "Chemistry", subjectCode: "CHEM", cbcLearningArea: "Chemistry", isCore: false },
    });
    const staffTeacher = await prisma.staff.create({
        data: {
            tenantId: tenant.tenantId,
            userId: teacherUser.userId,
            tscNumber: "T001",
            fullName: "Alice Wanjiku",
            nationalId: "30011001",
            staffType: "TEACHING",
            specialization: "Mathematics",
            employmentType: "PERMANENT",
            joinedDate: new Date("2019-03-01"),
            phone: "+254711001001",
            email: "teacher1@greenvalley.ac.ke",
        },
    });
    await prisma.staff.create({
        data: {
            tenantId: tenant.tenantId,
            userId: financeUser.userId,
            tscNumber: "F001",
            fullName: "Peter Mwangi",
            nationalId: "30011009",
            staffType: "SUPPORT",
            specialization: "Finance",
            employmentType: "PERMANENT",
            joinedDate: new Date("2020-01-15"),
            phone: "+254700111003",
            email: "finance@greenvalley.ac.ke",
        },
    });
    await prisma.classTeacherAssignment.createMany({
        data: [
            { tenantId: tenant.tenantId, classId: class7.classId, staffId: staffTeacher.staffId, yearId: year.yearId, assignmentType: "FORM_TEACHER", isActive: true },
            { tenantId: tenant.tenantId, classId: class7.classId, staffId: staffTeacher.staffId, yearId: year.yearId, assignmentType: "SUBJECT_TEACHER", subjectId: mathJss.subjectId, isActive: true },
            { tenantId: tenant.tenantId, classId: class10.classId, staffId: staffTeacher.staffId, yearId: year.yearId, assignmentType: "SUBJECT_TEACHER", subjectId: biologySss.subjectId, isActive: true },
        ],
    });
    const student = await prisma.student.create({
        data: {
            tenantId: tenant.tenantId,
            userId: studentUser.userId,
            nemisNumber: "NEMIS2026001",
            fullName: "John Mwangi Kamau",
            dateOfBirth: new Date("2013-04-12"),
            gender: "MALE",
            classId: class7.classId,
            admissionNumber: "ADM001",
            admittedDate: new Date("2023-01-09"),
            currentGrade: "Grade 7",
            tierId: jssTier.tierId,
            promotionStatus: "ACTIVE",
        },
    });
    const student2User = await prisma.user.upsert({
        where: { tenantId_email: { tenantId: tenant.tenantId, email: "adm002@greenvalley.ac.ke" } },
        update: {},
        create: {
            tenantId: tenant.tenantId,
            email: "adm002@greenvalley.ac.ke",
            passwordHash: studentPassword,
            role: "STUDENT",
            fullName: "Faith Akinyi Odhiambo",
        },
    });
    const student2 = await prisma.student.create({
        data: {
            tenantId: tenant.tenantId,
            userId: student2User.userId,
            nemisNumber: "NEMIS2026002",
            fullName: "Faith Akinyi Odhiambo",
            dateOfBirth: new Date("2013-07-22"),
            gender: "FEMALE",
            classId: class7.classId,
            admissionNumber: "ADM002",
            admittedDate: new Date("2023-01-09"),
            currentGrade: "Grade 7",
            tierId: jssTier.tierId,
            promotionStatus: "ACTIVE",
        },
    });
    const parent = await prisma.parent.create({
        data: {
            tenantId: tenant.tenantId,
            userId: parentUser.userId,
            fullName: "James Kamau Mwangi",
            nationalId: "12345001",
            phonePrimary: "+254711101001",
            relationship: "FATHER",
        },
    });
    await prisma.parentStudentLink.create({
        data: {
            tenantId: tenant.tenantId,
            parentId: parent.parentId,
            studentId: student.studentId,
            isPrimaryContact: true,
        },
    });
    const feeStructure = await prisma.feeStructure.create({
        data: {
            tenantId: tenant.tenantId,
            yearId: year.yearId,
            tierId: jssTier.tierId,
            termId: term.termId,
            feeType: "Tuition Fee",
            amountKes: 15000,
            isMandatory: true,
            dueDate: new Date("2025-06-30"),
        },
    });
    await prisma.feePayment.create({
        data: {
            tenantId: tenant.tenantId,
            studentId: student.studentId,
            feeStructureId: feeStructure.feeStructureId,
            amountPaid: 10000,
            paymentMethod: "MPESA",
            mpesaCode: "QAB123456",
            receiptNumber: "RCP000001",
            recordedBy: financeUser.userId,
        },
    });
    await prisma.mark.create({
        data: {
            tenantId: tenant.tenantId,
            studentId: student.studentId,
            subjectId: mathJss.subjectId,
            classId: class7.classId,
            termId: term.termId,
            assessmentType: "FORMATIVE",
            rawScore: 84,
            cbcGrade: "ME",
            maxScore: 100,
            enteredBy: teacherUser.userId,
            isPublished: true,
            publishedAt: new Date(),
        },
    });
    await prisma.attendance.create({
        data: {
            tenantId: tenant.tenantId,
            studentId: student.studentId,
            classId: class7.classId,
            termId: term.termId,
            attendanceDate: new Date("2025-05-29"),
            status: "PRESENT",
            markedBy: teacherUser.userId,
            notes: null,
        },
    });
    await prisma.cbcCompetency.create({
        data: {
            tenantId: tenant.tenantId,
            studentId: student.studentId,
            termId: term.termId,
            competencyArea: "Communication & Collaboration",
            level: "ME",
            assessedBy: teacherUser.userId,
        },
    });
    await prisma.studentPortfolio.create({
        data: {
            tenantId: tenant.tenantId,
            studentId: student.studentId,
            subjectId: mathJss.subjectId,
            termId: term.termId,
            title: "Science Project: Water Purification Model",
            description: "CBC portfolio evidence",
            fileType: "document",
            uploadedBy: teacherUser.userId,
            isVisibleParent: true,
        },
    });
    await prisma.report.create({
        data: {
            tenantId: tenant.tenantId,
            studentId: student.studentId,
            classId: class7.classId,
            termId: term.termId,
            reportType: "TERM_REPORT",
            generatedBy: teacherUser.userId,
            approvedBy: principalUser.userId,
            approvedAt: new Date(),
            isPublished: true,
            publishedAt: new Date(),
        },
    });
    await prisma.expense.create({
        data: {
            tenantId: tenant.tenantId,
            yearId: year.yearId,
            category: "Utilities",
            description: "Electricity bill - May",
            amountKes: 18500,
            expenseDate: new Date("2025-05-31"),
            recordedBy: financeUser.userId,
            approvedBy: principalUser.userId,
            status: "APPROVED",
        },
    });
    await prisma.payroll.create({
        data: {
            tenantId: tenant.tenantId,
            staffId: staffTeacher.staffId,
            yearId: year.yearId,
            month: 5,
            grossSalary: 68000,
            deductions: 8200,
            netSalary: 59800,
            paymentStatus: "PAID",
            paidAt: new Date(),
            processedBy: financeUser.userId,
        },
    });
    const thread = await prisma.messageThread.create({
        data: {
            tenantId: tenant.tenantId,
            subject: "Term 2 Progress Update",
            createdBy: teacherUser.userId,
            participants: {
                create: [
                    { tenantId: tenant.tenantId, userId: teacherUser.userId, roleLabel: "SENDER" },
                    { tenantId: tenant.tenantId, userId: parentUser.userId, roleLabel: "PARENT" },
                ],
            },
            messages: {
                create: {
                    tenantId: tenant.tenantId,
                    senderId: teacherUser.userId,
                    body: "Hello parent, please review the latest report and portfolio items.",
                },
            },
        },
    });
    await prisma.timetableEntry.create({
        data: {
            tenantId: tenant.tenantId,
            yearId: year.yearId,
            termId: term.termId,
            classId: class7.classId,
            subjectId: mathJss.subjectId,
            staffId: staffTeacher.staffId,
            dayOfWeek: 1,
            startTime: "08:00",
            endTime: "08:40",
            room: "Room 3",
            createdBy: adminUser.userId,
        },
    });
    await prisma.notification.create({
        data: {
            tenantId: tenant.tenantId,
            recipientUserId: parentUser.userId,
            title: "Report Ready",
            message: "Your child's term report has been published.",
            type: "REPORT",
            priority: "HIGH",
            channel: "IN_APP",
            isRead: false,
            relatedType: "thread",
            relatedId: thread.threadId,
        },
    });
    await prisma.notificationTemplate.createMany({
        data: [
            {
                templateKey: "REPORT_READY",
                titleTemplate: "Report Ready",
                bodyTemplate: "Your child's term report has been published.",
                channel: "IN_APP",
                priority: "HIGH",
            },
            {
                templateKey: "ATTENDANCE_ABSENT",
                titleTemplate: "Attendance Alert",
                bodyTemplate: "Your child was marked absent today.",
                channel: "SMS",
                priority: "HIGH",
            },
            {
                templateKey: "FEE_RECEIPT",
                titleTemplate: "Fee Payment Received",
                bodyTemplate: "We received your payment and generated receipt {{receipt}}.",
                channel: "SMS",
                priority: "HIGH",
            },
        ],
        skipDuplicates: true,
    });
    const announcementsRoom = await prisma.chatRoom.upsert({
        where: { roomKey: "greenvalley-announcements" },
        update: {},
        create: {
            tenantId: tenant.tenantId,
            roomKey: "greenvalley-announcements",
            roomType: "ANNOUNCEMENT",
            name: "School Announcements",
            description: "Official school-wide notices and term updates.",
            createdByUserId: adminUser.userId,
        },
    });
    const staffRoom = await prisma.chatRoom.upsert({
        where: { roomKey: "greenvalley-staff-general" },
        update: {},
        create: {
            tenantId: tenant.tenantId,
            roomKey: "greenvalley-staff-general",
            roomType: "GROUP",
            name: "Staff General",
            description: "Daily staff coordination and quick updates.",
            createdByUserId: adminUser.userId,
        },
    });
    const classRoom = await prisma.chatRoom.upsert({
        where: { roomKey: "greenvalley-grade7-red" },
        update: {},
        create: {
            tenantId: tenant.tenantId,
            roomKey: "greenvalley-grade7-red",
            roomType: "CLASS",
            name: "Grade 7 Red",
            description: "Class discussion for Grade 7 Red.",
            classId: class7.classId,
            tierKey: "JSS",
            createdByUserId: teacherUser.userId,
        },
    });
    const financeRoom = await prisma.chatRoom.upsert({
        where: { roomKey: "greenvalley-finance-help" },
        update: {},
        create: {
            tenantId: tenant.tenantId,
            roomKey: "greenvalley-finance-help",
            roomType: "FINANCE",
            name: "Finance Help Desk",
            description: "Fee support and payment verification.",
            createdByUserId: financeUser.userId,
        },
    });
    const hqSupportRoom = await prisma.chatRoom.upsert({
        where: { roomKey: "greenvalley-hq-support" },
        update: {},
        create: {
            tenantId: tenant.tenantId,
            roomKey: "greenvalley-hq-support",
            roomType: "SUPPORT",
            name: "HQ Support",
            description: "Support channel between TechSwiftTrix HQ and Green Valley.",
            createdByPlatformUserId: hq.platformUserId,
        },
    });
    await prisma.chatRoomMember.createMany({
        data: [
            { tenantId: tenant.tenantId, roomId: announcementsRoom.roomId, userId: adminUser.userId, roleLabel: "ADMIN" },
            { tenantId: tenant.tenantId, roomId: announcementsRoom.roomId, userId: principalUser.userId, roleLabel: "PRINCIPAL" },
            { tenantId: tenant.tenantId, roomId: announcementsRoom.roomId, userId: teacherUser.userId, roleLabel: "TEACHER" },
            { tenantId: tenant.tenantId, roomId: announcementsRoom.roomId, userId: studentUser.userId, roleLabel: "STUDENT" },
            { tenantId: tenant.tenantId, roomId: announcementsRoom.roomId, userId: parentUser.userId, roleLabel: "PARENT" },
            { tenantId: tenant.tenantId, roomId: announcementsRoom.roomId, userId: financeUser.userId, roleLabel: "FINANCE" },
            { tenantId: tenant.tenantId, roomId: staffRoom.roomId, userId: adminUser.userId, roleLabel: "ADMIN" },
            { tenantId: tenant.tenantId, roomId: staffRoom.roomId, userId: principalUser.userId, roleLabel: "PRINCIPAL" },
            { tenantId: tenant.tenantId, roomId: staffRoom.roomId, userId: teacherUser.userId, roleLabel: "TEACHER" },
            { tenantId: tenant.tenantId, roomId: staffRoom.roomId, userId: financeUser.userId, roleLabel: "FINANCE" },
            { tenantId: tenant.tenantId, roomId: classRoom.roomId, userId: teacherUser.userId, roleLabel: "TEACHER" },
            { tenantId: tenant.tenantId, roomId: classRoom.roomId, userId: studentUser.userId, roleLabel: "STUDENT" },
            { tenantId: tenant.tenantId, roomId: classRoom.roomId, userId: student2User.userId, roleLabel: "STUDENT" },
            { tenantId: tenant.tenantId, roomId: classRoom.roomId, userId: parentUser.userId, roleLabel: "PARENT" },
            { tenantId: tenant.tenantId, roomId: financeRoom.roomId, userId: financeUser.userId, roleLabel: "FINANCE" },
            { tenantId: tenant.tenantId, roomId: financeRoom.roomId, userId: adminUser.userId, roleLabel: "ADMIN" },
            { tenantId: tenant.tenantId, roomId: financeRoom.roomId, userId: parentUser.userId, roleLabel: "PARENT" },
            { tenantId: tenant.tenantId, roomId: hqSupportRoom.roomId, platformUserId: hq.platformUserId, roleLabel: "SUPER_ADMIN" },
            { tenantId: tenant.tenantId, roomId: hqSupportRoom.roomId, userId: adminUser.userId, roleLabel: "ADMIN" },
            { tenantId: tenant.tenantId, roomId: hqSupportRoom.roomId, userId: financeUser.userId, roleLabel: "FINANCE" },
        ],
        skipDuplicates: true,
    });
    const existingChatMessage = await prisma.chatMessage.findFirst({
        where: {
            roomId: {
                in: [
                    announcementsRoom.roomId,
                    staffRoom.roomId,
                    classRoom.roomId,
                    financeRoom.roomId,
                    hqSupportRoom.roomId,
                ],
            },
        },
    });
    if (!existingChatMessage) {
        const classRoomMessage1 = await prisma.chatMessage.create({
            data: {
                tenantId: tenant.tenantId,
                roomId: classRoom.roomId,
                senderUserId: teacherUser.userId,
                messageType: "TEXT",
                content: "Good morning Grade 7 Red. Please review the lesson notes before today's Maths session.",
            },
        });
        const classRoomMessage2 = await prisma.chatMessage.create({
            data: {
                tenantId: tenant.tenantId,
                roomId: classRoom.roomId,
                senderUserId: studentUser.userId,
                messageType: "TEXT",
                content: "I have a question about the assignment, @Alice Wanjiku.",
            },
        });
        await prisma.chatMessage.create({
            data: {
                tenantId: tenant.tenantId,
                roomId: announcementsRoom.roomId,
                senderUserId: adminUser.userId,
                messageType: "TEXT",
                content: "Term 2 progress reports are now ready for parent review.",
            },
        });
        await prisma.chatMessage.create({
            data: {
                tenantId: tenant.tenantId,
                roomId: financeRoom.roomId,
                senderUserId: financeUser.userId,
                messageType: "TEXT",
                content: "Fee reconciliation for ADM001 has been completed. Receipt available in the finance panel.",
            },
        });
        await prisma.chatMessage.create({
            data: {
                tenantId: tenant.tenantId,
                roomId: hqSupportRoom.roomId,
                senderPlatformUserId: hq.platformUserId,
                messageType: "TEXT",
                content: "HQ onboarding check-in: Green Valley analytics, sync health, and billing are all green.",
            },
        });
        await prisma.chatReadReceipt.createMany({
            data: [
                { tenantId: tenant.tenantId, messageId: classRoomMessage1.messageId, userId: teacherUser.userId },
                { tenantId: tenant.tenantId, messageId: classRoomMessage2.messageId, userId: studentUser.userId },
            ],
            skipDuplicates: true,
        });
    }
    await prisma.mpesaTransaction.create({
        data: {
            tenantId: tenant.tenantId,
            studentId: student.studentId,
            phoneNumber: parent.phonePrimary,
            amount: 10000,
            mpesaCode: "QAB123456",
            status: "CONFIRMED",
            rawPayload: JSON.stringify({ source: "seed" }),
        },
    });
    console.log("Seeded CBCNexus demo data");
}
main()
    .finally(async () => {
    await prisma.$disconnect();
});

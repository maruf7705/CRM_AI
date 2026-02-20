"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const client_1 = require("@prisma/client");
const password_1 = require("../src/utils/password");
const helpers_1 = require("../src/utils/helpers");
const prisma = new client_1.PrismaClient();
const ORG_NAME = "Acme Corp";
const ORG_SLUG = "acme-corp";
const SEED_PASSWORD = "Password123!";
const resolveSeedKey = () => {
    const raw = process.env.ENCRYPTION_KEY ??
        "4c9f4d0fb7f5c6fa52e15f21a0fc3b7f2f914a5db1b6eb1f0c6c2f0f157b0b86";
    if (/^[a-fA-F0-9]{64}$/.test(raw)) {
        return Buffer.from(raw, "hex");
    }
    return (0, node_crypto_1.createHash)("sha256").update(raw).digest();
};
const seedKey = resolveSeedKey();
const encryptCredentials = (payload) => {
    const iv = (0, node_crypto_1.randomBytes)(12);
    const cipher = (0, node_crypto_1.createCipheriv)("aes-256-gcm", seedKey, iv);
    const raw = JSON.stringify(payload);
    const encrypted = Buffer.concat([cipher.update(raw, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
};
const hoursAgo = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000);
const minutesAfter = (date, minutes) => new Date(date.getTime() + minutes * 60 * 1000);
async function main() {
    console.info("Seeding OmniDesk data...");
    await prisma.organization.deleteMany({ where: { slug: ORG_SLUG } });
    await prisma.user.deleteMany({
        where: {
            email: {
                in: ["owner@acme.com", "sarah@acme.com", "mike@acme.com"],
            },
        },
    });
    const passwordHash = await (0, password_1.hashPassword)(SEED_PASSWORD);
    const organization = await prisma.organization.create({
        data: {
            name: ORG_NAME,
            slug: ORG_SLUG,
            plan: client_1.Plan.PROFESSIONAL,
            maxAgents: 25,
            maxChannels: 10,
            aiEnabled: true,
            aiMode: client_1.AiMode.SUGGESTION,
            aiSystemPrompt: "You are an assistant for Acme Corp. Be concise, empathetic, and include practical next steps.",
            aiModel: "gpt-4o",
            aiTemperature: 0.7,
            aiMaxTokens: 900,
            n8nWebhookUrl: "https://example.app.n8n.cloud/webhook/ai-reply",
        },
    });
    const owner = await prisma.user.create({
        data: {
            email: "owner@acme.com",
            passwordHash,
            firstName: "Alex",
            lastName: "Owner",
            emailVerified: true,
            isActive: true,
            lastLoginAt: hoursAgo(2),
        },
    });
    const admin = await prisma.user.create({
        data: {
            email: "sarah@acme.com",
            passwordHash,
            firstName: "Sarah",
            lastName: "Admin",
            emailVerified: true,
            isActive: true,
            lastLoginAt: hoursAgo(5),
        },
    });
    const agent = await prisma.user.create({
        data: {
            email: "mike@acme.com",
            passwordHash,
            firstName: "Mike",
            lastName: "Agent",
            emailVerified: true,
            isActive: true,
            lastLoginAt: hoursAgo(1),
        },
    });
    await prisma.orgMember.createMany({
        data: [
            {
                organizationId: organization.id,
                userId: owner.id,
                role: client_1.Role.OWNER,
                isOnline: true,
                maxConcurrent: 50,
            },
            {
                organizationId: organization.id,
                userId: admin.id,
                role: client_1.Role.ADMIN,
                isOnline: true,
                maxConcurrent: 25,
            },
            {
                organizationId: organization.id,
                userId: agent.id,
                role: client_1.Role.AGENT,
                isOnline: true,
                maxConcurrent: 15,
            },
        ],
    });
    const facebookChannel = await prisma.channel.create({
        data: {
            organizationId: organization.id,
            type: client_1.ChannelType.FACEBOOK,
            name: "Acme Corp Page",
            externalId: "fb_page_923001",
            isActive: true,
            credentials: encryptCredentials({
                pageId: "fb_page_923001",
                pageAccessToken: "token_facebook_demo",
            }),
            webhookSecret: "fb-demo-secret",
            metadata: {
                category: "Business Service",
            },
            lastSyncAt: hoursAgo(4),
        },
    });
    const instagramChannel = await prisma.channel.create({
        data: {
            organizationId: organization.id,
            type: client_1.ChannelType.INSTAGRAM,
            name: "@acmecorp",
            externalId: "ig_account_58122",
            isActive: true,
            credentials: encryptCredentials({
                igAccountId: "ig_account_58122",
                accessToken: "token_instagram_demo",
            }),
            webhookSecret: "ig-demo-secret",
            metadata: {
                username: "@acmecorp",
            },
            lastSyncAt: hoursAgo(3),
        },
    });
    const whatsappChannel = await prisma.channel.create({
        data: {
            organizationId: organization.id,
            type: client_1.ChannelType.WHATSAPP,
            name: "+1 555-0100",
            externalId: "wa_phone_1001",
            isActive: true,
            credentials: encryptCredentials({
                phoneNumberId: "wa_phone_1001",
                accessToken: "token_whatsapp_demo",
            }),
            webhookSecret: "wa-demo-secret",
            metadata: {
                displayNumber: "+1 555-0100",
            },
            lastSyncAt: hoursAgo(2),
        },
    });
    const contactSeeds = [
        {
            firstName: "John",
            lastName: "Doe",
            stage: client_1.ContactStage.LEAD,
            email: "john.doe@horizonmail.com",
            phone: "+1-202-555-0111",
            company: "Northwind Labs",
            leadScore: 78,
            facebookId: "fb_u_101",
            instagramId: null,
            whatsappId: "wa_u_101",
        },
        {
            firstName: "Jane",
            lastName: "Smith",
            stage: client_1.ContactStage.CUSTOMER,
            email: "jane.smith@lumen.io",
            phone: "+1-202-555-0112",
            company: "Lumen Ventures",
            leadScore: 92,
            facebookId: null,
            instagramId: "ig_u_102",
            whatsappId: null,
        },
        {
            firstName: "Carlos",
            lastName: "Mendez",
            stage: client_1.ContactStage.QUALIFIED,
            email: "carlos@zenitac.com",
            phone: "+1-202-555-0113",
            company: "Zenitac",
            leadScore: 84,
            facebookId: "fb_u_103",
            instagramId: "ig_u_103",
            whatsappId: null,
        },
        {
            firstName: "Amina",
            lastName: "Rahman",
            stage: client_1.ContactStage.NEW,
            email: "amina@sunpeak.co",
            phone: "+1-202-555-0114",
            company: "SunPeak",
            leadScore: 50,
            facebookId: null,
            instagramId: "ig_u_104",
            whatsappId: "wa_u_104",
        },
        {
            firstName: "Noah",
            lastName: "Baker",
            stage: client_1.ContactStage.LEAD,
            email: "noah@brightcrate.com",
            phone: "+1-202-555-0115",
            company: "BrightCrate",
            leadScore: 66,
            facebookId: "fb_u_105",
            instagramId: null,
            whatsappId: "wa_u_105",
        },
        {
            firstName: "Emma",
            lastName: "Clark",
            stage: client_1.ContactStage.CUSTOMER,
            email: "emma@riverline.ai",
            phone: "+1-202-555-0116",
            company: "Riverline AI",
            leadScore: 96,
            facebookId: "fb_u_106",
            instagramId: "ig_u_106",
            whatsappId: null,
        },
        {
            firstName: "Liam",
            lastName: "Nguyen",
            stage: client_1.ContactStage.NEW,
            email: "liam@cloudharbor.io",
            phone: "+1-202-555-0117",
            company: "CloudHarbor",
            leadScore: 41,
            facebookId: null,
            instagramId: null,
            whatsappId: "wa_u_107",
        },
        {
            firstName: "Sophia",
            lastName: "Turner",
            stage: client_1.ContactStage.QUALIFIED,
            email: "sophia@apexlane.com",
            phone: "+1-202-555-0118",
            company: "ApexLane",
            leadScore: 88,
            facebookId: "fb_u_108",
            instagramId: "ig_u_108",
            whatsappId: "wa_u_108",
        },
        {
            firstName: "Ethan",
            lastName: "Cole",
            stage: client_1.ContactStage.CUSTOMER,
            email: "ethan@hightide.biz",
            phone: "+1-202-555-0119",
            company: "HighTide",
            leadScore: 90,
            facebookId: "fb_u_109",
            instagramId: null,
            whatsappId: null,
        },
        {
            firstName: "Maya",
            lastName: "Patel",
            stage: client_1.ContactStage.LEAD,
            email: "maya@oakridge.dev",
            phone: "+1-202-555-0120",
            company: "Oakridge Dev",
            leadScore: 73,
            facebookId: null,
            instagramId: "ig_u_110",
            whatsappId: "wa_u_110",
        },
    ];
    const contacts = await Promise.all(contactSeeds.map((seed, index) => prisma.contact.create({
        data: {
            organizationId: organization.id,
            firstName: seed.firstName,
            lastName: seed.lastName,
            displayName: `${seed.firstName} ${seed.lastName}`,
            email: seed.email,
            phone: seed.phone,
            company: seed.company,
            leadScore: seed.leadScore,
            stage: seed.stage,
            notes: `Created from CRM seed profile #${index + 1}.`,
            facebookId: seed.facebookId,
            instagramId: seed.instagramId,
            whatsappId: seed.whatsappId,
            lastSeenAt: hoursAgo(index + 1),
        },
    })));
    const vipTag = await prisma.tag.create({
        data: {
            organizationId: organization.id,
            name: "VIP",
            color: "#f59e0b",
        },
    });
    const newLeadTag = await prisma.tag.create({
        data: {
            organizationId: organization.id,
            name: "New Lead",
            color: "#22c55e",
        },
    });
    const supportTag = await prisma.tag.create({
        data: {
            organizationId: organization.id,
            name: "Support",
            color: "#ef4444",
        },
    });
    await prisma.contactTag.createMany({
        data: [
            { contactId: contacts[0].id, tagId: vipTag.id },
            { contactId: contacts[1].id, tagId: vipTag.id },
            { contactId: contacts[3].id, tagId: newLeadTag.id },
            { contactId: contacts[4].id, tagId: newLeadTag.id },
            { contactId: contacts[6].id, tagId: supportTag.id },
            { contactId: contacts[7].id, tagId: supportTag.id },
            { contactId: contacts[8].id, tagId: vipTag.id },
        ],
    });
    const channels = [facebookChannel, instagramChannel, whatsappChannel];
    const statusCycle = [
        client_1.ConversationStatus.OPEN,
        client_1.ConversationStatus.PENDING,
        client_1.ConversationStatus.RESOLVED,
        client_1.ConversationStatus.CLOSED,
        client_1.ConversationStatus.OPEN,
    ];
    const priorityCycle = [client_1.Priority.LOW, client_1.Priority.MEDIUM, client_1.Priority.HIGH, client_1.Priority.URGENT];
    const customerOpeners = [
        "Hi! I saw your ad and need pricing details.",
        "Can someone help me track my current order?",
        "Do you offer a monthly plan with onboarding?",
        "I need support with account verification.",
        "Is there a discount for annual billing?",
        "How quickly can your team respond after signup?",
        "I need to connect WhatsApp and Instagram in one inbox.",
        "Can I add three agents on the starter tier?",
        "My webhook stopped working, can you check?",
        "Do you have API docs for message sync?",
    ];
    const humanReplies = [
        "Absolutely. I can share plan options and recommend the best fit.",
        "I checked your account and your order is currently in transit.",
        "Yes, onboarding is included on professional and enterprise plans.",
        "I can assist right now. Please confirm the email on your account.",
        "Yes, annual billing includes a 20 percent discount.",
        "Our average first response time is under 4 minutes.",
        "Yes, OmniDesk supports both channels with one shared inbox.",
        "Starter supports up to five channels and standard seat limits.",
        "Please share the webhook endpoint so I can validate the signature setup.",
        "Yes, I will send the API docs link after this message.",
    ];
    const aiReplies = [
        "Great question. Our pricing starts at $29 per month and scales by channels and AI usage.",
        "I can help with that. Please confirm your registered email and I will pull the latest status.",
        "You can enable AI suggestions without auto-reply in Settings > AI Mode.",
        "For verification issues, check spam for the latest email or request a new link.",
        "Annual subscriptions include savings and priority onboarding support.",
    ];
    const followUps = [
        "Thanks, that helps. Can you also include setup time?",
        "Perfect. Please send a quick summary to my email.",
        "Got it. Is this available on mobile too?",
        "Understood. I can test this later today.",
        "Can your AI suggest replies instead of sending automatically?",
    ];
    const conversations = [];
    for (let index = 0; index < 15; index += 1) {
        const channel = channels[index % channels.length];
        const contact = contacts[index % contacts.length];
        const status = statusCycle[index % statusCycle.length];
        const priority = priorityCycle[index % priorityCycle.length];
        const createdAt = hoursAgo(72 - index * 3);
        const conversation = await prisma.conversation.create({
            data: {
                organizationId: organization.id,
                channelId: channel.id,
                contactId: contact.id,
                externalId: `${channel.type.toLowerCase()}_thread_${index + 1}`,
                status,
                priority,
                subject: `Conversation ${index + 1} with ${contact.displayName}`,
                aiEnabled: true,
                assignedToId: index % 2 === 0 ? agent.id : admin.id,
                metadata: {
                    source: channel.type,
                    initiatedBy: "contact",
                },
                createdAt,
            },
        });
        const opener = customerOpeners[index % customerOpeners.length];
        const humanReply = humanReplies[index % humanReplies.length];
        const aiReply = aiReplies[index % aiReplies.length];
        const followUp = followUps[index % followUps.length];
        const includeAi = index % 3 === 0;
        const timeline = [
            minutesAfter(createdAt, 2),
            minutesAfter(createdAt, 8),
            minutesAfter(createdAt, 21),
            minutesAfter(createdAt, 34),
        ];
        const messages = [
            {
                conversationId: conversation.id,
                direction: client_1.Direction.INBOUND,
                sender: client_1.SenderType.CONTACT,
                content: opener,
                contentType: "TEXT",
                status: client_1.MessageStatus.READ,
                createdAt: timeline[0],
            },
            {
                conversationId: conversation.id,
                direction: client_1.Direction.OUTBOUND,
                sender: includeAi ? client_1.SenderType.AI : client_1.SenderType.AGENT,
                content: includeAi ? aiReply : humanReply,
                contentType: "TEXT",
                status: client_1.MessageStatus.SENT,
                isAiGenerated: includeAi,
                aiConfidence: includeAi ? 0.87 : null,
                userId: includeAi ? null : (index % 2 === 0 ? agent.id : admin.id),
                createdAt: timeline[1],
            },
            {
                conversationId: conversation.id,
                direction: client_1.Direction.INBOUND,
                sender: client_1.SenderType.CONTACT,
                content: followUp,
                contentType: "TEXT",
                status: client_1.MessageStatus.READ,
                createdAt: timeline[2],
            },
            {
                conversationId: conversation.id,
                direction: client_1.Direction.OUTBOUND,
                sender: client_1.SenderType.AGENT,
                content: "Thanks for the details. I have sent the full answer and next steps so you can proceed today.",
                contentType: "TEXT",
                status: client_1.MessageStatus.SENT,
                userId: index % 2 === 0 ? agent.id : admin.id,
                createdAt: timeline[3],
            },
        ];
        await prisma.message.createMany({ data: messages });
        const lastMessage = messages[messages.length - 1];
        await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
                lastMessageAt: lastMessage.createdAt,
                lastMessagePreview: lastMessage.content.slice(0, 100),
                unreadCount: status === client_1.ConversationStatus.OPEN ? 1 : 0,
                isAiHandling: false,
                closedAt: status === client_1.ConversationStatus.CLOSED ? minutesAfter(createdAt, 60) : null,
            },
        });
        conversations.push({ id: conversation.id, channelType: channel.type });
    }
    await prisma.cannedResponse.createMany({
        data: [
            {
                organizationId: organization.id,
                shortcut: "/greeting",
                title: "Greeting",
                content: "Hi there! Thanks for contacting Acme Corp. How can we help today?",
                category: "General",
            },
            {
                organizationId: organization.id,
                shortcut: "/pricing",
                title: "Pricing Summary",
                content: "Our plans start at $29/month. Share your channel and team size for an exact recommendation.",
                category: "Sales",
            },
            {
                organizationId: organization.id,
                shortcut: "/hours",
                title: "Business Hours",
                content: "Our support team is available Monday to Friday, 9 AM to 8 PM EST.",
                category: "Support",
            },
            {
                organizationId: organization.id,
                shortcut: "/thanks",
                title: "Thank You",
                content: "Thank you for reaching out. If you need anything else, we are here to help.",
                category: "General",
            },
            {
                organizationId: organization.id,
                shortcut: "/followup",
                title: "Follow Up",
                content: "Checking in to confirm whether the last solution worked for you.",
                category: "Support",
            },
        ],
    });
    await prisma.aiTrainingDoc.createMany({
        data: [
            {
                organizationId: organization.id,
                title: "Company Overview",
                content: "Acme Corp offers omnichannel CRM software for SMBs with AI-assisted support and automation.",
                fileType: "text/markdown",
                isActive: true,
            },
            {
                organizationId: organization.id,
                title: "Pricing Reference",
                content: "Free: 2 channels / 100 AI replies. Starter: $29. Pro: $79. Enterprise: custom contract.",
                fileType: "text/plain",
                isActive: true,
            },
            {
                organizationId: organization.id,
                title: "FAQ",
                content: "Common questions include onboarding, response SLAs, integrations, and AI suggestion controls.",
                fileType: "text/plain",
                isActive: true,
            },
        ],
    });
    const analyticsPayloads = conversations.slice(0, 18).map((entry, index) => ({
        organizationId: organization.id,
        type: index % 2 === 0 ? "message_sent" : "message_received",
        channel: entry.channelType,
        data: {
            conversationId: entry.id,
            actor: index % 2 === 0 ? "agent" : "contact",
            latencyMs: 1200 + index * 53,
        },
        createdAt: hoursAgo(48 - index),
    }));
    await prisma.analyticsEvent.createMany({ data: analyticsPayloads });
    await prisma.notification.createMany({
        data: [
            {
                userId: owner.id,
                title: "New high-priority conversation",
                body: "A WhatsApp conversation was marked URGENT and assigned to support.",
                type: "conversation_priority",
                isRead: false,
            },
            {
                userId: admin.id,
                title: "AI suggestion ready",
                body: "A suggestion is waiting for review in conversation #7.",
                type: "ai_suggestion",
                isRead: false,
            },
            {
                userId: agent.id,
                title: "Unread messages",
                body: "You have 3 unread customer replies in your queue.",
                type: "unread_alert",
                isRead: true,
            },
        ],
    });
    await prisma.apiKey.create({
        data: {
            organizationId: organization.id,
            name: "Internal Automation",
            keyHash: (0, node_crypto_1.createHash)("sha256").update("acme-internal-api-key").digest("hex"),
            isActive: true,
        },
    });
    const webhookLogs = [
        {
            organizationId: organization.id,
            source: client_1.ChannelType.FACEBOOK,
            direction: "inbound",
            payload: { event: "message", id: "fb_event_1" },
            statusCode: 200,
            processedAt: hoursAgo(12),
        },
        {
            organizationId: organization.id,
            source: client_1.ChannelType.INSTAGRAM,
            direction: "inbound",
            payload: { event: "message", id: "ig_event_2" },
            statusCode: 200,
            processedAt: hoursAgo(8),
        },
        {
            organizationId: organization.id,
            source: client_1.ChannelType.WHATSAPP,
            direction: "outbound",
            payload: { event: "delivery", id: "wa_event_3" },
            statusCode: 200,
            processedAt: hoursAgo(5),
        },
    ];
    await prisma.webhookLog.createMany({ data: webhookLogs });
    console.info("Seed completed:");
    console.info(`- Organization: ${organization.name} (${(0, helpers_1.toSlug)(organization.name)})`);
    console.info("- Users: owner@acme.com, sarah@acme.com, mike@acme.com");
    console.info("- Channels: Facebook, Instagram, WhatsApp");
    console.info("- Contacts: 10");
    console.info("- Conversations: 15");
    console.info("- Messages: 60");
}
main()
    .catch((error) => {
    console.error("Seed failed", error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});

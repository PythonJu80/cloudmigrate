/**
 * One-time script to seed AWS cloud migration knowledge into the database
 * Run with: docker compose exec dev npx tsx scripts/seed-knowledge.ts
 */

import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";

const prisma = new PrismaClient();

// AWS Cloud Migration knowledge - scraped from https://aws.amazon.com/what-is/cloud-migration/
const KNOWLEDGE_CHUNKS = [
  {
    title: "What Is Cloud Migration?",
    content: `Cloud migration is the process where you move digital assets like data, applications, and IT resources to the cloud. Traditionally, organizations ran their applications and IT services on self-managed IT infrastructure that was maintained in an on-premises data center. Some organizations may have thousands of databases, applications, and system software running on-site. When you migrate to the cloud, you shift these workloads from on-premises data centers to the cloud provider's infrastructure in a planned, nondisruptive way. With a cloud migration strategy, you prioritize workloads, plan, and test so you can systematically move your operations to the cloud.`,
  },
  {
    title: "Cloud Migration Benefits - Cost Efficiency",
    content: `Cloud migration can result in significant cost savings for your business. Organizations that shift to the public cloud reduce the costs of maintaining physical data centers, such as hardware procurement, power, and cooling costs. Migration frees skilled employees from data center administration tasks and allows them to focus on business development. The savings in human resources are significant. Cloud provider fees are typically lower than the cost of running a local data center. You only pay for the cloud resources you use, which makes it easier to scale up or down based on business demands. The cloud offers a variety of pricing models, including significant free tiers, so your company can choose the most cost-effective option for your needs.`,
  },
  {
    title: "Cloud Migration Benefits - Scalability",
    content: `One of the major advantages of the cloud is its inherent scalability. Your business can easily adjust its IT resources in response to fluctuating workloads without undergoing costly and time-consuming infrastructure upgrades. This dynamic scalability helps ensure that your applications perform optimally during peak times and you don't waste resources during off-peak hours. Most cloud providers offer a wider range of services and tools than an organization can set up for itself. You can use the cloud to innovate and adapt to changing market conditions more swiftly.`,
  },
  {
    title: "Cloud Migration Benefits - Security",
    content: `Major cloud providers like Amazon Web Services (AWS) invest heavily in security to protect their infrastructure and your data. This means they often have robust data security measures, including encryption, multi-factor authentication (MFA), and regular security audits. Additionally, several backup and disaster recovery mechanisms exist to protect all digital assets. Cloud providers take responsibility for security of the cloud. Meanwhile, you're responsible for implementing the right configurations and access controls to protect your data in the cloud.`,
  },
  {
    title: "Cloud Migration Benefits - Performance",
    content: `When your business migrates to the cloud, you benefit from the most recent advancements in server and network technology. This helps ensure faster processing speeds and optimal application performance. You can also take advantage of globally distributed data centers and content delivery networks. Your users receive content from the geographically closest servers, which reduces latency and increases load times. Through cloud migration, you can help ensure applications and services consistently operate at their peak, enhancing user experience, boosting productivity, and providing a competitive advantage.`,
  },
  {
    title: "Cloud Migration Benefits - Sustainability",
    content: `Due to their scale, cloud providers can achieve higher energy efficiency levels than traditional data centers. They can optimize server utilization, use more energy-efficient hardware, and employ advanced cooling techniques. If your organization migrates to the cloud, you can enjoy cost savings while contributing to a more sustainable environment.`,
  },
  {
    title: "Cloud Migration Strategy - Rehosting (Lift and Shift)",
    content: `Rehosting involves moving an application's components to the cloud with little or no modification. Essentially, you take what you have in your current environment and lift and shift it to the cloud infrastructure. This is often the quickest way to migrate, as it doesn't require changes to the application's architecture. However, not all legacy application designs take advantage of everything the cloud environment offers. So, this cloud migration strategy may not always be the best approach for maximizing cloud benefits.`,
  },
  {
    title: "Cloud Migration Strategy - Relocating (Lift and Optimize)",
    content: `Relocating is often referred to as lift and optimize. In this approach, you move applications to the cloud without significant changes. However, once they're in the cloud, you might transition them to cloud-centered services. For instance, after you relocate a database to the cloud, you might migrate from a hosted virtual machine (VM) to a managed database service. This provides some benefits of cloud-centered capabilities without extensive initial refactoring.`,
  },
  {
    title: "Cloud Migration Strategy - Refactoring",
    content: `In refactoring, you rearchitect applications to take full advantage of cloud-centered features. For example, you may decompose monolithic architectures into microservices or replace existing modules with fully managed cloud services. Businesses often choose this approach when they need to add features, scale, or boost performance that would be difficult to achieve in the application's existing environment.`,
  },
  {
    title: "Cloud Migration Strategy - Replatforming",
    content: `Replatforming—or lift, tinker, shift—is a middle-ground approach between rehosting and refactoring. Here, you make some optimizations to the application to take advantage of cloud capabilities but not as extensively as in refactoring. You move specific components to a cloud-based service that offers advanced features with integration and customization for your use case. For example, you might replace an older, manually intensive data management environment with an autonomous cloud database service that updates automatically and offers built-in machine learning models.`,
  },
  {
    title: "Cloud Migration Strategy - Repurchasing",
    content: `In repurchasing, you move to a different product and usually abandon or replace existing software licenses for your application. For example, you could move from a traditional virtual desktop infrastructure (VDI) in your data center to a fully managed cloud-based VDI. You make the decision to purchase cloud-centered applications and retire current ones.`,
  },
  {
    title: "Cloud Migration Strategy - Retiring",
    content: `In retiring, you turn off assets that you no longer require or that are outdated in the modern cloud computing environment. When you decommission outdated assets, your organization can focus your resources and efforts on what matters most. You can save on cloud migration costs and reduce the complexity of the migration process.`,
  },
  {
    title: "Cloud Migration Strategy - Retaining",
    content: `In retaining (or revisiting), you hold off on migration for some time. This might be needed for applications or workloads that have recently undergone significant upgrades or that have unclear reasons for migration. Your organization may decide to keep these applications on-premises or in their current environment until there's a compelling reason to migrate. It's important to periodically revisit and reassess these applications to determine if and when they should be migrated in the future.`,
  },
  {
    title: "Types of Cloud Migration - Database Migration",
    content: `Database migration transfers a database from one environment to another. You could move from on-premises to the cloud, from one cloud provider to another, or upgrade to a new database engine. This process requires careful data mapping and schema transformation to avoid errors. You also have to plan the migration in a way that minimizes downtime. Popular approaches include: Replication-based data migration keeps both databases in sync as it duplicates data from source to target. Full export from source to a secure device shipped to the cloud provider for importing to target. Extract data, schema conversion, and load data to the cloud database over a secure network connection.`,
  },
  {
    title: "Types of Cloud Migration - Application Migration",
    content: `Application migration focuses on moving existing applications from on-premises infrastructure or one cloud environment to another. This can involve rehosting an app with minimal changes, replatforming it to take advantage of cloud-native capabilities like managed databases or serverless computing, or refactoring it entirely to follow a microservices-based architecture. Successful migration depends on factors like code compatibility, performance tuning, and cloud service dependencies. The most complex application migration involves moving legacy mainframe applications—often written in COBOL or other outdated languages—to new cloud infrastructure.`,
  },
  {
    title: "Types of Cloud Migration - Hybrid Migration",
    content: `Hybrid cloud migration moves some workloads to the cloud while keeping others on-premises. This approach is often used when organizations want to continue using existing infrastructure while still accessing cloud benefits. For example, peak workloads may be moved to the cloud to scale as necessary. Hybrid cloud architectures use orchestration tools for seamless connectivity between diverse environments. Hybrid migration is often the first step towards a larger, more complete migration.`,
  },
  {
    title: "Types of Cloud Migration - Data Center Migration",
    content: `Data center migration involves moving an entire on-premises infrastructure—including servers, storage, networking, and applications—to the cloud. This type of migration typically requires all the cloud migration strategies and careful planning and management. The complexity depends on the data center size, security requirements, and how well legacy systems integrate with cloud services. Organizations choose this migration to reduce operational costs, increase scalability, and improve disaster recovery capabilities.`,
  },
  {
    title: "Types of Cloud Migration - Cloud-to-Cloud Migration",
    content: `Cloud-to-cloud migration happens when an organization moves workloads between cloud service providers. This could be due to cost savings, better performance, regulatory requirements, or improved service offerings from another provider. Data transfer speed, downtime risks, and potential vendor lock-in must also be managed carefully.`,
  },
  {
    title: "Cloud Migration Steps - Phase 1: Assess",
    content: `All cloud migrations begin with understanding your current IT portfolio, including applications, workloads, and data. During the assessment phase, you: Identify the business goals and objectives of the migration. Understand the technical requirements and constraints of your applications and data. Estimate the costs and potential savings from the migration. Prioritize which applications and data should be migrated first based on factors like business value and migration complexity. The assessment phase is crucial because it lays the foundation for successful cloud migration.`,
  },
  {
    title: "Cloud Migration Steps - Phase 2: Mobilize",
    content: `The mobilization phase involves establishing the necessary resources, tools, and processes to carry out cloud migrations effectively and efficiently. In the mobilize phase, you: Build a core cloud team, including roles such as cloud architects and cloud developers. Develop a comprehensive migration plan that includes timelines, milestones, and key deliverables. Set up the cloud environment and ensure its correct and secure configurations. Begin migrating pilot applications. Pilot applications let you test your cloud migration strategy and process.`,
  },
  {
    title: "Cloud Migration Steps - Phase 3: Migrate and Modernize",
    content: `The actual migration of applications, workloads, and data occurs in this phase. During this phase, you: Use the insights and lessons learned from the pilot migrations to migrate applications and workloads at scale. Optimize the architecture of applications to take advantage of cloud-centered features and services. Monitor the performance, security, and cost of your new cloud environment, and adjust as necessary. Continually improve and innovate by adopting new cloud technology and capabilities as they become available. This phase is ongoing, as continuous improvement is critical to cloud transformation.`,
  },
  {
    title: "Cloud Migration Challenges - Technical Complexity",
    content: `Technical complexities in your existing systems have to be identified and properly managed. For example, some applications might be interdependent, and moving one without the others may disrupt operations. Older systems might be incompatible with cloud environments and require significant refactoring or even complete redevelopment.`,
  },
  {
    title: "Cloud Migration Challenges - Scalability Challenges",
    content: `Moving a large number of applications to the cloud requires staged effort and planning. For example, transferring large data volumes to the cloud can be time-consuming with limited bandwidth. If issues arise post-migration, rolling back to the previous state might be complex and time-intensive. Some interdependent migrations might temporarily require applications to be offline, which can impact business operations.`,
  },
  {
    title: "Cloud Migration Challenges - Skills Gap",
    content: `Cloud platforms might be unfamiliar to in-house teams used to traditional IT environments. Employees might be hesitant to adopt the cloud. Organizations must train existing staff or hire new talent with the necessary cloud skills. Beyond that, your internal culture often needs to change to get teams to embrace and effectively use new cloud migration tools and processes.`,
  },
  {
    title: "AWS Cloud Migration Tools",
    content: `AWS provides a range of cloud migration tools to reduce risk and help ensure a reliable migration: AWS Application Discovery Service gathers information about your source servers to support the migration planning. AWS Application Migration Service provides an automated approach for rehosting servers to the AWS cloud. AWS Database Migration Service (AWS DMS) helps you migrate databases to AWS quickly and securely with replication from source to target database. AWS DataSync automates moving file and object data between on-premises and AWS storage services. AWS Migration Acceleration Program (MAP) is a comprehensive and proven cloud migration program. Migration Evaluator delivers accurate data-driven recommendations for right-size and right-cost computing.`,
  },
  {
    title: "The 7 Rs of Cloud Migration",
    content: `The 7 Rs are the main cloud migration strategies: 1) Rehosting (lift and shift) - move with no changes. 2) Relocating (lift and optimize) - move then optimize. 3) Refactoring - rearchitect for cloud-native. 4) Replatforming (lift, tinker, shift) - some optimizations. 5) Repurchasing - replace with cloud product. 6) Retiring - decommission unused assets. 7) Retaining - keep on-premises for now. Choose based on business needs, technical complexity, and desired outcomes.`,
  },
  // AWS Well-Architected Framework - 6 Pillars
  {
    title: "AWS Well-Architected Framework Overview",
    content: `The AWS Well-Architected Framework helps cloud architects build secure, high-performing, resilient, and efficient infrastructure for applications. It provides a consistent approach for evaluating architectures and implementing designs that scale over time. The framework is built on six pillars that represent key design principles and best practices for running workloads in the cloud.`,
  },
  {
    title: "Well-Architected Pillar 1: Operational Excellence",
    content: `Operational Excellence focuses on running and monitoring systems to deliver business value and continually improving processes and procedures. Key topics include: automating changes, responding to events, and defining standards to manage daily operations. Best practices: perform operations as code, make frequent small reversible changes, refine operations procedures frequently, anticipate failure, and learn from all operational failures.`,
  },
  {
    title: "Well-Architected Pillar 2: Security",
    content: `The Security pillar focuses on protecting information, systems, and assets while delivering business value through risk assessments and mitigation strategies. Key topics include: confidentiality and integrity of data, identifying and managing who can do what (privilege management), protecting systems, and establishing controls to detect security events. Best practices: implement a strong identity foundation, enable traceability, apply security at all layers, automate security best practices, protect data in transit and at rest, keep people away from data, and prepare for security events.`,
  },
  {
    title: "Well-Architected Pillar 3: Reliability",
    content: `Reliability focuses on ensuring a workload performs its intended function correctly and consistently when expected. Key topics include: distributed system design, recovery planning, and how to handle change. Best practices: automatically recover from failure, test recovery procedures, scale horizontally to increase aggregate workload availability, stop guessing capacity, and manage change in automation.`,
  },
  {
    title: "Well-Architected Pillar 4: Performance Efficiency",
    content: `Performance Efficiency focuses on using computing resources efficiently to meet system requirements and maintaining that efficiency as demand changes and technologies evolve. Key topics include: selecting the right resource types and sizes based on workload requirements, monitoring performance, and making informed decisions to maintain efficiency as business needs evolve. Best practices: democratize advanced technologies, go global in minutes, use serverless architectures, experiment more often, and consider mechanical sympathy.`,
  },
  {
    title: "Well-Architected Pillar 5: Cost Optimization",
    content: `Cost Optimization focuses on avoiding unnecessary costs. Key topics include: understanding and controlling where money is being spent, selecting the most appropriate and right number of resource types, analyzing spend over time, and scaling to meet business needs without overspending. Best practices: implement cloud financial management, adopt a consumption model, measure overall efficiency, stop spending money on undifferentiated heavy lifting, and analyze and attribute expenditure.`,
  },
  {
    title: "Well-Architected Pillar 6: Sustainability",
    content: `Sustainability focuses on minimizing the environmental impacts of running cloud workloads. Key topics include: a shared responsibility model for sustainability, understanding impact, and maximizing utilization to minimize required resources and reduce downstream impacts. Best practices: understand your impact, establish sustainability goals, maximize utilization, anticipate and adopt new more efficient hardware and software offerings, use managed services, and reduce the downstream impact of your cloud workloads.`,
  },
  // AWS Large Migration Guide
  {
    title: "Large Migration Definition and Scale",
    content: `Migrating 300 or more servers is considered a large migration. Large migrations require a different approach than smaller ones - you need dedicated teams, automated tools, and a factory-like migration process. The goal is to migrate as fast as possible with the least impact to business operations. AWS has helped thousands of customers complete large-scale migrations, and the patterns and best practices are well-established.`,
  },
  {
    title: "Large Migration - The Migration Factory Model",
    content: `For large migrations, AWS recommends a "migration factory" approach. This is a repeatable, industrialized process that can migrate hundreds of servers efficiently. Key components: 1) Portfolio discovery and planning - understand what you have. 2) Wave planning - group servers into migration waves. 3) Automated migration tools - use AWS Application Migration Service. 4) Testing and cutover procedures - validate before switching. 5) Optimization - right-size after migration. The factory model can achieve 20-50+ server migrations per week at scale.`,
  },
  {
    title: "Large Migration - Common Challenges",
    content: `Large migrations face unique challenges: 1) Incomplete inventory - you don't know what you have. 2) Application dependencies - servers are interconnected. 3) Legacy systems - old tech that's hard to move. 4) Organizational resistance - people fear change. 5) Skills gaps - teams lack cloud experience. 6) Business continuity - can't afford downtime. 7) Compliance requirements - regulatory constraints. Success requires addressing all of these systematically.`,
  },
  {
    title: "Large Migration - Success Factors",
    content: `Key success factors for large migrations: 1) Executive sponsorship - leadership must champion the effort. 2) Dedicated migration team - not a side project. 3) Clear business case - know why you're migrating. 4) Realistic timeline - plan for 12-24 months for 1000+ servers. 5) Early wins - start with easier workloads to build momentum. 6) Automated tooling - manual processes don't scale. 7) Continuous communication - keep stakeholders informed. 8) Post-migration optimization - the work doesn't end at cutover.`,
  },
  // 3M Case Study
  {
    title: "3M Enterprise Migration Case Study",
    content: `3M, a global manufacturing company, migrated nearly all their enterprise workloads from aging data centers to AWS in under 30 months. This was one of the largest enterprise migrations ever completed. They migrated thousands of applications and servers, including mission-critical systems. The migration was completed on time and under budget, demonstrating that even the largest enterprises can successfully move to the cloud.`,
  },
  {
    title: "3M Migration - Key Strategies Used",
    content: `3M's successful migration used several key strategies: 1) AWS Application Migration Service for automated server replication. 2) Wave-based migration approach - grouping related applications. 3) Strong partnership with AWS Professional Services. 4) Dedicated migration factory team. 5) Extensive testing before cutover. 6) Clear communication with business stakeholders. 7) Focus on quick wins to build momentum and confidence.`,
  },
  {
    title: "3M Migration - Lessons Learned",
    content: `Key lessons from 3M's migration: 1) Start early with discovery - you need to know what you have. 2) Invest in automation - manual processes are too slow for large scale. 3) Build a strong partnership with your cloud provider. 4) Don't underestimate change management - people are harder than technology. 5) Plan for the unexpected - have contingency plans. 6) Celebrate milestones - keep teams motivated. 7) Optimize after migration - don't try to do everything at once.`,
  },
  // Practical advice for non-technical users
  {
    title: "Cloud Migration for Non-Technical Users",
    content: `Cloud migration doesn't have to be complicated. Here's what you need to know: 1) The cloud is just someone else's computer - but better managed, more secure, and more scalable. 2) You don't need to understand all the technical details - that's what tools like CloudMigrate are for. 3) Start small - migrate one application or dataset first. 4) The benefits are real - cost savings, better performance, and less maintenance. 5) Your data is safe - cloud providers invest billions in security.`,
  },
  {
    title: "Choosing the Right Migration Approach - Simple Guide",
    content: `Not sure which migration strategy to use? Here's a simple guide: 1) Just want to move quickly? Use Rehosting (lift and shift). 2) Want some cloud benefits without major changes? Use Replatforming. 3) Ready for a complete modernization? Use Refactoring. 4) Have old software you can replace? Use Repurchasing. 5) Have stuff you don't need anymore? Retire it. 6) Not ready to move something? Retain it for now. Most companies use a mix of these strategies.`,
  },
  {
    title: "Common Migration Fears - Addressed",
    content: `Worried about cloud migration? Here are common fears and the reality: 1) "It's too expensive" - Actually, most companies save 20-40% on IT costs. 2) "My data won't be secure" - Cloud providers have better security than most on-premises setups. 3) "It's too complicated" - Modern tools make migration much simpler. 4) "We'll have downtime" - Proper planning means minimal or zero downtime. 5) "We'll lose control" - You maintain full control of your data and applications. 6) "Our team doesn't have the skills" - That's what migration partners and tools are for.`,
  },
  {
    title: "Migration Timeline Expectations",
    content: `How long does cloud migration take? It depends on scale: Small (10-50 servers): 2-4 months. Medium (50-200 servers): 4-8 months. Large (200-1000 servers): 8-18 months. Enterprise (1000+ servers): 18-36 months. These are typical timelines for well-planned migrations. Rushing leads to problems. Factors that affect timeline: complexity of applications, team experience, business constraints, and how much modernization you want to do during migration.`,
  },
  {
    title: "Migration Cost Estimation",
    content: `Cloud migration costs include: 1) One-time migration costs - tools, consulting, temporary parallel running. 2) Ongoing cloud costs - compute, storage, networking. 3) Training and change management. Typical one-time migration costs: $500-2000 per server for simple rehosting, $2000-10000 per application for replatforming, $10000-50000+ per application for refactoring. Most companies see ROI within 12-24 months through reduced infrastructure costs, improved efficiency, and faster innovation.`,
  },
];

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("❌ OPENAI_API_KEY not set in environment");
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });

  console.log("🧹 Clearing all existing knowledge chunks...");
  await prisma.knowledgeChunk.deleteMany({});

  console.log(`📚 Embedding ${KNOWLEDGE_CHUNKS.length} knowledge chunks...`);

  for (let i = 0; i < KNOWLEDGE_CHUNKS.length; i++) {
    const chunk = KNOWLEDGE_CHUNKS[i];
    console.log(`  [${i + 1}/${KNOWLEDGE_CHUNKS.length}] ${chunk.title}`);

    // Get embedding from OpenAI
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: `${chunk.title}\n\n${chunk.content}`,
    });

    const embedding = embeddingResponse.data[0].embedding;

    // Store in database
    await prisma.knowledgeChunk.create({
      data: {
        source: "cloudmigrate-knowledge-base",
        title: chunk.title,
        content: chunk.content,
        embedding: JSON.stringify(embedding),
        metadata: JSON.stringify({ index: i }),
      },
    });
  }

  console.log("✅ Knowledge base seeded successfully!");
  console.log(`   Total chunks: ${KNOWLEDGE_CHUNKS.length}`);
  
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});

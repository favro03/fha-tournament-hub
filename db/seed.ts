import { PrismaClient } from '@prisma/client'
import sampleData from './sample-data'
import 'dotenv/config'

async function main() {
    const prisma = new PrismaClient();

    try {
        await prisma.hotel.deleteMany();
        await prisma.restaurant.deleteMany();
        await prisma.account.deleteMany();
        await prisma.session.deleteMany();
        await prisma.verificationToken.deleteMany();
        await prisma.user.deleteMany();

        await prisma.hotel.createMany({
            data: sampleData.hotels,
        });

        await prisma.restaurant.createMany({
            data: sampleData.restaurants,
        });

        await prisma.user.createMany({ data: sampleData.users });

        console.log('Database seeded successfully!');
    } catch (error) {
        console.error('Error seeding database:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });

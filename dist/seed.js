"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const sample_data_1 = __importDefault(require("./sample-data"));
require("dotenv/config");
async function main() {
    const prisma = new client_1.PrismaClient();
    try {
        await prisma.hotel.deleteMany();
        await prisma.restaurant.deleteMany();
        await prisma.hotel.createMany({
            data: sample_data_1.default.hotels,
        });
        await prisma.restaurant.createMany({
            data: sample_data_1.default.restaurants,
        });
        console.log('Database seeded successfully!');
    }
    catch (error) {
        console.error('Error seeding database:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
});

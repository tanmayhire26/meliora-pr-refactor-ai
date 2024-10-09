import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

interface Score {
    readability: number;
    maintainability: number;
    performance: number;
    proneness_to_error: number;
    test_coverage: number;
    modularity: number;
    scalability: number;
    complexity: number;
    adherence_to_solid_principles: number;
    documentation_quality: number;
    total_score: number;

}
@Schema({timestamps: true})
export class UserPrScore extends Document {
    @Prop({ required: true })
    userName: string;

    @Prop({ required: true })
    prNumber: number;

    @Prop({ default: Date.now })
    createdAt: Date;

    @Prop({ required: false, type: Object }) 
    score: Score;

    @Prop({ required: false, type: Object })
    analysis: any;
}

export const UserPrScoreSchema = SchemaFactory.createForClass(UserPrScore);

import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { getApp } from 'test/setup-e2e';

describe('CoefficientController (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        app = await getApp();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('/questionnaire/coefficients (GET)', () => {
        it('should return an array of coefficients', () => {
            return request(app.getHttpServer())
                .get('/questionnaire/coefficients')
                .expect(200)
                .expect((res) => {
                    expect(Array.isArray(res.body)).toBe(true);
                });
        });
    });

    describe('/questionnaire/coefficients/:code (GET)', () => {
        it('should return coefficient value', () => {
            const code = 'test';
            return request(app.getHttpServer())
                .get(`/questionnaire/coefficients/${code}`)
                .query({ value: '1' })
                .expect(200)
                .expect((res) => {
                    expect(typeof res.body).toBe('number');
                });
        });

        it('should return 404 if coefficient not found', () => {
            const code = 'not-found';
            return request(app.getHttpServer())
                .get(`/questionnaire/coefficients/${code}`)
                .expect(404);
        });
    });
});
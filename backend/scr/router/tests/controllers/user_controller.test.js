import { register, login, getUser, deleteUser, updatePassword } from '../../controllers/user_controller';
import { Request, Response } from 'express';

describe('user controller - register', () => {
    it('should register new user with status 200', () => {
        const req = {name: "tester", password: "tester", confirm_password: "tester"} as Request;
        const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        } as unknown as Response;

        register(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({});
        }
    )
})
import bcrypt from 'bcrypt';


const checkCorrectPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
    // the first input must be the password in string format
    // the second input must be the hashed password you want to compare with in string format
    const check = await bcrypt.compare(password, hashedPassword);
    return check;
}

const hash = async (password: string): Promise<string> => {
    // the first input is the string you want to hash
    // the second input is the difficulty of the hash
    const hashedPassword = await bcrypt.hash(password, 15);
    return hashedPassword;
}

export {hash, checkCorrectPassword}
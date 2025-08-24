import jwt from "jsonwebtoken";

export const verifyJWT = async (req, res, next) => {

    try {

        const authHeader = req.headers['authorization']
        const token = authHeader && authHeader.split(" ")[1];

        if(!token) {
            return res.status(401).json({error: "No Access Token!"})
        }

        jwt.verify(token, process.env.SECRET_ACCESS_KEY, (err, user) => {
            if(err) {
                return res.status(403).json({error: "Access token is Invalid"})
            }

            req.user = user.id 
            next();
        })

        
    } catch (error) {

        res.status(500).json({error: "Internal server error!"})
        
    }


}


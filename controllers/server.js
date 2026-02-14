const getServerPing = (req, res) => {
    res.json({
        code: 200,
        response: {
            result: "pong"
        }
    });
};

const getServerTime = (req, res) => {
    const now = new Date();
    res.json({
        code: 200,
        response: {
            result: {
                time: now.toISOString(),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }
        }
    });
};

module.exports = {
    getServerPing,
    getServerTime
};

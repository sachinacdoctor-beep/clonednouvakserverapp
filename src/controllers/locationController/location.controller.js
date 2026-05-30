
exports.checkAvailability = async (req, res) => {

    console.log("ddddddddddd");
    return res.status(200).json({
        status: true,
        message: 'You are in working zone'
    });
};


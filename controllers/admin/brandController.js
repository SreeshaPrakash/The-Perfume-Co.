const Brand = require("../../models/brandschema")
const Product = require("../../models/productschema")

const getBrandPage = async(req,res)=>{
    try {
        const page = parseInt(req.query.page) || 1
        const limit = 4
        const skip = (page - 1)*limit
        const brandData = await Brand.find({}).sort({createdAt:-1}).skip(skip).limit(limit)
        const totalBrands = await Brand.countDocuments()
        const totalPages = Math.ceil(totalBrands/limit)
        const reverseBrand = brandData.reverse()
        res.render("brands",{
            data :reverseBrand,
            currentPage : page,
            totalPages : totalPages,
            totalBrands : totalBrands,

        })
        } catch (error) {
            res.redirect("/pageerror")
    }
}



const addBrand = async(req,res)=>{
    try {

        //console.log(req.file)
        //console.log(req.body)

        const brand = req.body.name
        const findBrand = await Brand.findOne({brand})
        if(!findBrand){

            if (!req.file) {
                console.log("File not uploaded!");
                return res.status(400).send("No file uploaded.");
            }


            const image = req.file? req.file.filename :null
            //console.log("Uploaded Image:", image)
            const newBrand = new Brand({
                brandName:brand,
                brandImage :image,

            })
            await newBrand.save()
            res.redirect("/admin/brands")
        }
        else {
            console.log("Brand already exists!");
        }
    } catch (error) {
        console.error("Error in addBrand:", error);
        res.redirect("/pageerror")
    }
}

module.exports = {
    getBrandPage,
    addBrand,


}
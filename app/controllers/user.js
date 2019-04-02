var User = require('../models/user'),
	Inquiry = require('../models/inquiry'),
	Goods = require('../models/goods')

// req.session.destroy() 

// 随机背景图
var bgsrc = [
	'112745__interior-design-style-design-home-lock-room-fireplace_p.jpg',
	'132459__interior-design-style-design-home-house-room-kitchen_p.jpg',
	'191707__interior-room-apartment-design-style-cuisine-dishes-wood-wood-fruit_p.jpg',
	'503033__beautiful-room_p.jpg',
	'719896__room-living-beautiful-paper-wallpaper-walls_p.jpg',
	'720002__room-living-vintage-furniture-ladder-paper-image_p.jpg'
]
// 判断用户是否已经登录
exports.userRequired = function(req,res,next){
	var user = req.session.user

	if(user){
		console.log('用户已登录')
		return res.redirect('/')
	}
	next()
}
// 创建验证码
exports.createCaptcha = function(req, res, next){
	// 登录验证码
	var svgCaptcha = require('svg-captcha')
		svgCaptcha.options.height = '30'
		svgCaptcha.options.fontSize = '35'
		captcha = svgCaptcha.create({
		'size': 4,
		'ignoreChars': '0oO1iIlL',
		'noise': 3,
		'color': false
	})
	req.session.captcha = captcha
	if(req.query.changecaptcha){
		console.log(req.session.captcha.text)
		return res.json({
			success:1,
			captcha: req.session.captcha
		})
	}else{
		next()
	}
}
// 判断验证码
exports.checkedCaptcha = function(req, res, next){
	var captcha=req.body.captcha
	// 全部转为小写进行验证
	if((captcha).toLowerCase() !== (req.session.captcha.text).toLowerCase()){
		console.log('验证码错误，请重新输入。')
		return res.json({success:3})
	}else{
		next()
	}
}
// 登录&注册界面
exports.sign = function(req, res){
	var bgimg = bgsrc[Math.floor(Math.random()*bgsrc.length)],
		isSignin = req.originalUrl.indexOf('signin') === 1,
		page = 'signin',
		title = '登录'

	if(!isSignin){
		page = 'signup'
		title = '注册'
	}
	res.render('index/sign/'+page,{
		title: '用户'+title,
		bgsrc: bgimg,
		captcha: req.session.captcha,
		header_hide: true
	})
}

// signup
exports.signup = function(req, res, next){
	// var _user =req.body.signup
	var name = req.body.name
	var password = req.body.password
	var repassword = req.body.repassword

	User.findOne({name: name},function(err,user){
		if(err) console.log('服务器异常' + err)
		if(user && user.name!==''){
			// console.log('用户名已经存在')
			// req.session.signup_name_repeat = user.name
			// return res.redirect('/signin')
			return res.json({success:2})
		}else{
			// if(req.session.signup_name_repeat) delete req.session.signup_name_repeat
			var user = new User({
				name: name,
				password: password
			})

			user.save(function(err, user) {
				if(err) console.log(err)
				// 登录信息存储在session
				req.session.user = user
				// res.redirect('/store')
				next()
			})
		}
	})
}

// signin 登录
exports.signin = function(req, res, next){
	// var _user=req.body.user
	delete req.session.signup_name_repeat
	var name=req.body.name
	var password=req.body.password

	User.findOne({name: name},function(err, user){
		if(err) console.log(err)
		if(!user){
			console.log('undefined user')
			return res.json({success:2})
		}

		user.comparePassword(password, function(err, isMatch){

			console.log(isMatch)
			if(err) console.log(err)
			if(isMatch && password!=='') {
				console.log('Password is matched')
				// 登录信息存储在session
				req.session.user = user
				// 删除验证码信息
				delete req.session.captcha
				// res.json({success:1})
				next()
			}else{
				console.log('Password is not matched')
				return res.json({success:0})
			}
		})
	})
}

// logout
exports.logout = function(req, res){
	delete req.session.user
	res.redirect('/signin')
}

//userlist page
exports.list = function(req,res){
	User.fetch(function(err,users){
		if(err)console.log(err)
		console.log(users)
		res.render('admin/user/list', {
			title: '用户列表页',
			users: users
		})
	})
}

exports.signinRequired = function(req,res,next){
	// var user = req.session.user

	// if(!user){
	// 	console.log('未登录')
	// 	return res.redirect('/signin')
	// }
	next()
}

exports.adminRequired = function(req,res,next){
	// var user = req.session.user

	// console.log(user)

	// if(user.role <=10){
	// 	console.log('没有权限')
	// 	return res.render('prompt',{
	// 		message:'你的权限不够，无法访问该页面！'
	// 	})
	// }
	next()
}

// 用户中心
exports.detail = function(req,res){
	var user = req.session.user
	if(!user){
		return res.render('prompt',{
			message:'非法路径或该用户不存在。'
		})
	}

	var	page=req.params.page,
		orderId=req.params.id,
		shopcartgoodsNum = user.shopcartgoods.length

	User.findOne({'_id':user._id}, function (err,_user) {
		if(err) console.log(err)
		var title = _user.name + '的个人中心'
		if (!page) {
			Inquiry
				.find({'uid': _user.id, 'user_delete': 0})
				.limit(5)
				.exec(function (err, inquiries) {
					if(err) console.log(err)
					Goods
						.find({'favourite': _user._id})
						.limit(5)
						.populate('color material scene sort','attributes')
						.exec(function (err, favouritegoods) {
							if (err) console.log(err)
							console.log(favouritegoods)
							res.render('index/user',{
								title: title,
								user: _user,
								inquiries: inquiries,
								favouritegoods: favouritegoods,
								cart_goods_num: shopcartgoodsNum
							})
						})
				})
		} else if (page.toString() === 'setting') {
			res.render('user/setting',{
				title: '用户设置 - ' + title,
				user: user,
				cart_goods_num: shopcartgoodsNum
			})
		} else if (page.toString() === 'inquiries' && !orderId) {
			Inquiry.find({'uid': user._id, 'user_delete': 0},function (err, _inquiries) {
				res.render('index/user/inquiry',{
					title: '所有询价单 - ' + title,
					page: 'inquiries',
					inquiries: _inquiries,
					cart_goods_num: shopcartgoodsNum
				})
			})
		} else if (page.toString() === 'favourite') {
			Goods
				.find({'favourite': user._id})
				.populate('color material scene sort', 'attributes')
				.exec( function (err, favouritegoods) {
					if (err) console.log (err)
					res.render('index/user/inquiry', {
						title: '收藏夹 - ' + title,
						page: 'favourite',
						favouritegoods: favouritegoods,
						cart_goods_num: shopcartgoodsNum
					})
				})
		} else if (orderId) {
			Inquiry
				.findOne({'_id': orderId, 'user_delete': 0})
				.populate('goods.scene goods.material goods.color','attributes')
				.exec(function(err, _inquiry){
					if (!_inquiry) {
						return res.render('prompt',{
							message:'非法路径或该订单已经不存在。'
						})
					} else {
						res.render('index/user/inquiry_detail',{
							title: 'No.' + _inquiry._id + ' - ' + title,
							inquiry: _inquiry,
							cart_goods_num: shopcartgoodsNum
						})
					}
				})
		} else {
			res.render('error', {
				message: 'Not Found',
				error: {status: '404', stack: 'Error: Not Found'}
			})
		}
	})
}

// 后台用户详情
exports.adminDetail = function (req, res) {
	var name = req.params.name
	User.findOne({'name': name}, function (err, user) {
		if (err) console.log(err)
		// console.log(user)
		Inquiry.find({'uid': user.id}, function (err, orders){
			if (err) console.log(err)
			Goods
				.find({'favourite': user.id})
				.populate('color material scene sort','attributes')
				.exec( function (err, products) {
					if (err) console.log(err)
					console.log(products)
					res.render('admin/user/detail', {
						title: name + '用户的详情资料',
						user: user,
						orders: orders,
						products: products
					})
				})
		})
	})
}

// 更改密码
exports.changeword = function(req, res){
	var user = req.session.user,
		oldPassWord = req.query.oldpassword,
		newPassWord = req.query.newpassword,
		reNewPassWord = req.query.renewpassword

	// console.log('存在新密码')
	// console.log(newPassWord)

	console.log(oldPassWord + ',' + newPassWord + ',' + reNewPassWord)

	User.findOne({name: user.name},function(err, user){
		if(err) console.log(err)
		if(!user) return res.json({success:0})

		user.comparePassword(oldPassWord, function(err, isMatch){
			if(err) console.log(err)
			if(!newPassWord){
				// 密码验证
				if(isMatch && oldPassWord!=='') {
					// 验证成功
					return res.json({success:1})
				}else{
					// 验证失败
					return res.json({success:2})
				}
			}
			user.password = newPassWord
			console.log(user.password)
			// 密码加密
			user.hashPassword(newPassWord, function(err, hash){
				if(err) console.log(err)
				console.log(hash)
				User.findOneAndUpdate({name: user.name}, {$set: {'password': hash}}, function(err, _user){
					if(err) console.log(err)
					req.session.user = _user
					res.json({success: 3})
				})
			})


		})
	})
		
}

//userlist delete user
exports.del = function(req,res){
	var id = req.query.id

	res.json({success:1})

	// if(!id) return res.json({success:0})
	// User.remove({_id: id},function(err){
	// 	if(err){
	// 		console.log(err)
	// 		res.json({success:0})
	// 	}else{
	// 		res.json({success:1})
	// 	}
	// })
}